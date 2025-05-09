import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  StudentPreferenceSubjectQuerySchema,
  CreateStudentPreferenceSubjectSchema,
  UpdateStudentPreferenceSubjectSchema,
} from "@/schemas/student-preference-subject.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = StudentPreferenceSubjectQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const {
      page,
      limit,
      studentId,
      subjectId,
      subjectTypeId,
      preferenceId,
      sort,
      order,
    } = query;

    const filters: Record<string, unknown> = {};

    if (studentId) {
      // Find preference IDs that belong to this student
      const studentPreferences = await prisma.studentPreference.findMany({
        where: { studentId },
        select: { preferenceId: true },
      });

      // Get all preference IDs for this student
      const preferenceIds = studentPreferences.map((pref) => pref.preferenceId);

      if (preferenceIds.length > 0) {
        filters.studentPreferenceId = { in: preferenceIds };
      } else {
        // No preferences found for this student, return empty result
        return Response.json({
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            pages: 0,
          },
        });
      }
    }

    if (preferenceId) {
      filters.studentPreferenceId = preferenceId;
    }

    if (subjectId) {
      filters.subjectId = subjectId;
    }

    if (subjectTypeId) {
      filters.subjectTypeId = subjectTypeId;
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[sort] = order;

    const total = await prisma.studentPreferenceSubject.count({
      where: filters,
    });

    const studentPreferenceSubjects =
      await prisma.studentPreferenceSubject.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy,
        include: {
          studentPreference: {
            include: {
              student: {
                select: {
                  studentId: true,
                  name: true,
                },
              },
            },
          },
          subject: {
            select: {
              name: true,
            },
          },
          subjectType: {
            select: {
              name: true,
            },
          },
        },
      });

    return Response.json({
      data: studentPreferenceSubjects,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching student preference subjects:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : undefined;
    return Response.json(
      { error: "生徒科目関連の取得に失敗しました", details: errorMessage, stack: errorStack },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = CreateStudentPreferenceSubjectSchema.parse(body);
    const { studentId, subjectId, subjectTypeId, preferenceId } = data;

    // Check if the student exists
    const student = await prisma.student.findUnique({
      where: { studentId },
    });
    if (!student) {
      return Response.json({ error: "生徒が見つかりません" }, { status: 404 });
    }

    // Check if the subject exists
    const subject = await prisma.subject.findUnique({
      where: { subjectId },
    });
    if (!subject) {
      return Response.json({ error: "科目が見つかりません" }, { status: 404 });
    }

    // Check if the subject type exists
    const subjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId },
    });
    if (!subjectType) {
      return Response.json(
        { error: "科目タイプが見つかりません" },
        { status: 404 }
      );
    }

    // Check if the subject-subject type combination is valid
    const validPair = await prisma.subjectToSubjectType.findFirst({
      where: {
        subjectId,
        subjectTypeId,
      },
    });

    if (!validPair) {
      return Response.json(
        {
          error: "無効な科目と科目タイプの組み合わせ",
          message: `科目ID ${subjectId} と科目タイプID ${subjectTypeId} の組み合わせは有効ではありません。`,
        },
        { status: 400 }
      );
    }

    // Get or create the student preference
    let preference;
    if (preferenceId) {
      preference = await prisma.studentPreference.findUnique({
        where: { preferenceId },
      });

      if (!preference) {
        return Response.json(
          { error: "指定された学生の設定が見つかりません" },
          { status: 404 }
        );
      }

      // Make sure the preference belongs to the student
      if (preference.studentId !== studentId) {
        return Response.json(
          { error: "この学生設定は指定された学生のものではありません" },
          { status: 403 }
        );
      }
    } else {
      // Create a new preference if not provided
      preference = await prisma.studentPreference.create({
        data: {
          studentId,
        },
      });
    }

    // Check if the student-subject-subjectType relation already exists
    const existingRelation = await prisma.studentPreferenceSubject.findFirst({
      where: {
        studentPreferenceId: preference.preferenceId,
        subjectId,
        subjectTypeId,
      },
    });

    if (existingRelation) {
      return Response.json(
        { error: "この生徒-科目-タイプの関連はすでに存在します" },
        { status: 409 }
      );
    }

    const studentPreferenceSubject =
      await prisma.studentPreferenceSubject.create({
        data: {
          studentPreferenceId: preference.preferenceId,
          subjectId,
          subjectTypeId,
        },
      });

    return Response.json(
      {
        message: "生徒科目関連を作成しました",
        data: studentPreferenceSubject,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "入力値の検証に失敗しました", details: error.errors },
        { status: 400 }
      );
    }
    console.error(error);
    return Response.json(
      { error: "生徒科目関連の作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id } = UpdateStudentPreferenceSubjectSchema.parse(body);

    // Check if the relation exists
    const existingRelation = await prisma.studentPreferenceSubject.findUnique({
      where: { id },
    });

    if (!existingRelation) {
      return Response.json(
        { error: "生徒科目関連が見つかりません" },
        { status: 404 }
      );
    }

    const studentPreferenceSubject =
      await prisma.studentPreferenceSubject.update({
        where: { id },
        data: {},
      });

    return Response.json({
      message: "生徒科目関連を更新しました",
      data: studentPreferenceSubject,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "入力値の検証に失敗しました", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "生徒科目関連の更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "IDは必須です" }, { status: 400 });
    }

    const existingRelation = await prisma.studentPreferenceSubject.findUnique({
      where: { id },
    });

    if (!existingRelation) {
      return Response.json(
        { error: "生徒科目関連が見つかりません" },
        { status: 404 }
      );
    }

    await prisma.studentPreferenceSubject.delete({
      where: { id },
    });

    return Response.json({
      message: "生徒科目関連を削除しました",
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "生徒科目関連の削除に失敗しました" },
      { status: 500 }
    );
  }
}
