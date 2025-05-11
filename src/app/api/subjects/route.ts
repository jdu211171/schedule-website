import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  SubjectQuerySchema,
  CreateSubjectSchema,
  UpdateSubjectSchema,
} from "@/schemas/subject.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = SubjectQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const { page, limit, name, subjectTypeId, sort, order } = query;

    const filters: Record<string, unknown> = {};

    if (name) {
      filters.name = { contains: name, mode: "insensitive" };
    }

    // Filter by subjectTypeId through the join table if provided
    let whereCondition: Record<string, unknown> = { ...filters };
    if (subjectTypeId) {
      whereCondition = {
        ...whereCondition,
        subjectToSubjectTypes: {
          some: {
            subjectTypeId,
          },
        },
      };
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[sort] = order;

    const total = await prisma.subject.count({ where: whereCondition });

    const subjects = await prisma.subject.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      include: {
        subjectToSubjectTypes: {
          include: {
            subjectType: true,
          },
        },
        classSessions: { include: { classType: true } },
        regularClassTemplates: true,
        teacherSubjects: true,
        StudentPreferenceSubject: true,
      },
    });

    return Response.json({
      data: subjects,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "無効なクエリパラメータです", details: error.errors }, // "Invalid query parameters"
        { status: 400 }
      );
    }
    return Response.json(
      { error: "科目の取得に失敗しました" }, // "Failed to fetch subjects"
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 }); // "Forbidden"
  }

  try {
    const body = await request.json();
    const data = CreateSubjectSchema.parse(body);
    const { subjectTypeIds, ...subjectData } = data;

    // Verify that all subject types exist
    const existingSubjectTypes = await prisma.subjectType.findMany({
      where: {
        subjectTypeId: {
          in: subjectTypeIds,
        },
      },
    });

    if (existingSubjectTypes.length !== subjectTypeIds.length) {
      return Response.json(
        { error: "1つ以上の科目タイプが見つかりません" }, // "One or more subject types not found"
        { status: 404 }
      );
    }

    // Use a transaction to ensure both the subject and its relationships are created
    const createdSubject = await prisma.$transaction(async (tx) => {
      // Create the subject
      const newSubject = await tx.subject.create({
        data: subjectData,
      });

      // Create the subject-to-subject-type relationships
      await Promise.all(
        subjectTypeIds.map((subjectTypeId) =>
          tx.subjectToSubjectType.create({
            data: {
              subjectId: newSubject.subjectId,
              subjectTypeId,
            },
          })
        )
      );

      // Return only the essential data from the transaction
      return newSubject;
    });

    // After the transaction, fetch the complete subject data with all relations
    const subjectWithRelations = await prisma.subject.findUnique({
      where: { subjectId: createdSubject.subjectId },
      include: {
        subjectToSubjectTypes: {
          include: {
            subjectType: true,
          },
        },
        classSessions: { include: { classType: true } },
        regularClassTemplates: true,
        teacherSubjects: true,
        StudentPreferenceSubject: true,
      },
    });

    return Response.json(
      {
        message: "科目が正常に作成されました", // "Subject created successfully"
        data: subjectWithRelations, // Send the fully populated data
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "検証に失敗しました", details: error.errors }, // "Validation failed"
        { status: 400 }
      );
    }
    console.error("科目の作成エラー:", error); // "Error creating subject:"
    return Response.json(
      { error: "科目の作成に失敗しました" }, // "Failed to create subject"
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 });  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 });  }

  try {
    const body = await request.json();
    const { subjectId, subjectTypeIds, ...data } =
      UpdateSubjectSchema.parse(body);

    // Check if the subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { subjectId },
    });

    if (!existingSubject) {
      return Response.json({ error: "科目が存在しません" }, { status: 404 });
    }

    // Verify that all subject types exist if subjectTypeIds are provided
    if (subjectTypeIds) {
      const existingSubjectTypes = await prisma.subjectType.findMany({
        where: {
          subjectTypeId: {
            in: subjectTypeIds,
          },
        },
      });
      if (existingSubjectTypes.length !== subjectTypeIds.length) {
        return Response.json(
          { error: "1つ以上の科目種別が存在しません" },
          { status: 400 }
        );
      }
    }

    const updatedSubject = await prisma.$transaction(async (tx) => {
      // Update basic subject information
      const subject = await tx.subject.update({
        where: { subjectId },
        data: {
          ...data,
        },
      });

      // If subjectTypeIds are provided, update the associations
      if (subjectTypeIds) {
        // Delete existing associations
        await tx.subjectToSubjectType.deleteMany({
          where: { subjectId: subject.subjectId },
        });

        // Create new associations
        await tx.subjectToSubjectType.createMany({
          data: subjectTypeIds.map((subjectTypeId: string) => ({
            subjectId: subject.subjectId,
            subjectTypeId,
          })),
        });
      }
      return subject;
    });

    // Fetch the complete subject data with all relations after the transaction
    const subjectWithRelations = await prisma.subject.findUnique({
      where: { subjectId: updatedSubject.subjectId },
      include: {
        subjectToSubjectTypes: {
          include: {
            subjectType: true,
          },
        },
        classSessions: { include: { classType: true } },
        regularClassTemplates: true,
        teacherSubjects: true,
        StudentPreferenceSubject: true,
      },
    });

    return Response.json(
      {
        message: "科目が正常に更新されました",
        data: subjectWithRelations,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    console.error("科目の更新エラー:", error);
    return Response.json(
      { error: "科目の更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 }); // "Forbidden"
  }

  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");

    if (!subjectId) {
      return Response.json(
        { error: "科目IDは必須です" }, // "Subject ID is required"
        { status: 400 }
      );
    }

    const existingSubject = await prisma.subject.findUnique({
      where: { subjectId },
    });

    if (!existingSubject) {
      return Response.json({ error: "科目が見つかりません" }, { status: 404 }); // "Subject not found"
    }

    // Check for related records before deletion
    const hasRelatedClassSessions = await prisma.classSession.findFirst({
      where: { subjectId },
    });

    const hasRelatedTemplates = await prisma.regularClassTemplate.findFirst({
      where: { subjectId },
    });

    const hasRelatedTeacherSubjects = await prisma.teacherSubject.findFirst({
      where: { subjectId },
    });

    const hasRelatedStudentPreferences =
      await prisma.studentPreferenceSubject.findFirst({
        where: { subjectId },
      });

    if (
      hasRelatedClassSessions ||
      hasRelatedTemplates ||
      hasRelatedTeacherSubjects ||
      hasRelatedStudentPreferences
    ) {
      return Response.json(
        {
          error:
            "関連レコード（授業セッション、テンプレート、担当科目、または生徒の希望）があるため、科目を削除できません", // "Cannot delete subject with related records (class sessions, templates, teacher subjects, or student preferences)"
        },
        { status: 409 }
      );
    }

    // Use a transaction to delete both the subject and its relationships
    await prisma.$transaction(async (tx) => {
      // Delete subject-to-subject-type relationships
      await tx.subjectToSubjectType.deleteMany({
        where: { subjectId },
      });

      // Delete the subject
      await tx.subject.delete({ where: { subjectId } });
    });

    return Response.json({
      message: "科目が正常に削除されました", // "Subject deleted successfully"
    });
  } catch (error) {
    console.error("科目の削除エラー:", error); // "Error deleting subject:"
    return Response.json(
      { error: "科目の削除に失敗しました" }, // "Failed to delete subject"
      { status: 500 }
    );
  }
}
