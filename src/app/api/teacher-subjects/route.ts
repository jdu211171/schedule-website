import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  TeacherSubjectQuerySchema,
  CreateTeacherSubjectSchema,
  UpdateTeacherSubjectSchema,
} from "@/schemas/teacher-subject.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = TeacherSubjectQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const { page, limit, teacherId, subjectId, subjectTypeId, sort, order } =
      query;

    const filters: Record<string, unknown> = {};

    if (teacherId) {
      filters.teacherId = teacherId;
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

    const total = await prisma.teacherSubject.count({ where: filters });

    const teacherSubjects = await prisma.teacherSubject.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy,
      include: {
        teacher: {
          select: {
            name: true,
          },
        },
        subject: {
          select: {
            name: true,
            subjectToSubjectTypes: {
              include: {
                subjectType: true,
              },
            },
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
      data: teacherSubjects,
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
      { error: "先生の担当科目の取得に失敗しました" }, // "Failed to fetch teacher-subject relations"
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
    const data = CreateTeacherSubjectSchema.parse(body);
    const { teacherId, subjectId, subjectTypeId, notes } = data;

    // Check if the teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { teacherId },
    });
    if (!teacher) {
      return Response.json({ error: "先生が見つかりません" }, { status: 404 }); // "Teacher not found"
    }

    // Check if the subject exists
    const subject = await prisma.subject.findUnique({
      where: { subjectId },
    });
    if (!subject) {
      return Response.json({ error: "科目が見つかりません" }, { status: 404 }); // "Subject not found"
    }

    // Check if the subject type exists
    const subjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId },
    });
    if (!subjectType) {
      return Response.json(
        { error: "科目タイプが見つかりません" }, // "Subject type not found"
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
          error: "無効な科目と科目タイプの組み合わせです", // "Invalid subject-subject type combination"
          message: `科目ID ${subjectId} と科目タイプID ${subjectTypeId} の組み合わせは有効ではありません。`, // `The combination of subject ID ${subjectId} and subject type ID ${subjectTypeId} is not valid.`
        },
        { status: 400 }
      );
    }

    // Check if the teacher-subject relation already exists
    const existingRelation = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId_subjectTypeId: {
          teacherId,
          subjectId,
          subjectTypeId,
        },
      },
    });

    if (existingRelation) {
      return Response.json(
        { error: "この先生-科目-タイプの関連はすでに存在します" }, // "This teacher-subject-type relation already exists"
        { status: 409 }
      );
    }

    const teacherSubject = await prisma.teacherSubject.create({
      data: {
        teacherId,
        subjectId,
        subjectTypeId,
        notes,
      },
    });

    return Response.json(
      {
        message: "先生の担当科目が正常に作成されました", // "Teacher-subject relation created successfully"
        data: teacherSubject,
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
    return Response.json(
      { error: "先生の担当科目の作成に失敗しました" }, // "Failed to create teacher-subject relation"
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 }); // "Forbidden"
  }

  try {
    const body = await request.json();
    const { teacherId, subjectId, subjectTypeId, ...data } =
      UpdateTeacherSubjectSchema.parse(body);

    // Check if the teacher-subject relation exists
    const existingRelation = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId_subjectTypeId: {
          teacherId,
          subjectId,
          subjectTypeId,
        },
      },
    });

    if (!existingRelation) {
      return Response.json(
        { error: "先生の担当科目が見つかりません" }, // "Teacher-subject relation not found"
        { status: 404 }
      );
    }

    // The PUT endpoint is only updating notes, not changing the subject/subject type combination
    // so we don't need to re-validate the combination

    const teacherSubject = await prisma.teacherSubject.update({
      where: {
        teacherId_subjectId_subjectTypeId: {
          teacherId,
          subjectId,
          subjectTypeId,
        },
      },
      data,
    });

    return Response.json({
      message: "先生の担当科目が正常に更新されました", // "Teacher-subject relation updated successfully"
      data: teacherSubject,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "検証に失敗しました", details: error.errors }, // "Validation failed"
        { status: 400 }
      );
    }
    return Response.json(
      { error: "先生の担当科目の更新に失敗しました" }, // "Failed to update teacher-subject relation"
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
    const teacherId = searchParams.get("teacherId");
    const subjectId = searchParams.get("subjectId");
    const subjectTypeId = searchParams.get("subjectTypeId");

    if (!teacherId || !subjectId || !subjectTypeId) {
      return Response.json(
        { error: "先生ID、科目ID、科目タイプIDはすべて必須です" }, // "Teacher ID, Subject ID, and Subject Type ID are all required"
        { status: 400 }
      );
    }

    const existingRelation = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId_subjectTypeId: {
          teacherId,
          subjectId,
          subjectTypeId,
        },
      },
    });

    if (!existingRelation) {
      return Response.json(
        { error: "先生の担当科目が見つかりません" }, // "Teacher-subject relation not found"
        { status: 404 }
      );
    }

    await prisma.teacherSubject.delete({
      where: {
        teacherId_subjectId_subjectTypeId: {
          teacherId,
          subjectId,
          subjectTypeId,
        },
      },
    });

    return Response.json({
      message: "先生の担当科目が正常に削除されました", // "Teacher-subject relation deleted successfully"
    });
  } catch {
    return Response.json(
      { error: "先生の担当科目の削除に失敗しました" }, // "Failed to delete teacher-subject relation"
      { status: 500 }
    );
  }
}
