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
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
        { error: "無効なクエリパラメータ", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "講師-科目関連の取得に失敗しました" },
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
    const data = CreateTeacherSubjectSchema.parse(body);

    // Check if the teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { teacherId: data.teacherId },
    });
    if (!teacher) {
      return Response.json({ error: "講師が見つかりません" }, { status: 404 });
    }

    // Check if the subject exists
    const subject = await prisma.subject.findUnique({
      where: { subjectId: data.subjectId },
    });
    if (!subject) {
      return Response.json({ error: "科目が見つかりません" }, { status: 404 });
    }

    // Check if the subject type exists
    const subjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId: data.subjectTypeId },
    });
    if (!subjectType) {
      return Response.json(
        { error: "科目タイプが見つかりません" },
        { status: 404 }
      );
    }

    // Check if the teacher-subject relation already exists
    const existingRelation = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId_subjectTypeId: {
          teacherId: data.teacherId,
          subjectId: data.subjectId,
          subjectTypeId: data.subjectTypeId,
        },
      },
    });

    if (existingRelation) {
      return Response.json(
        { error: "この講師-科目-タイプの関連はすでに存在します" },
        { status: 409 }
      );
    }

    const teacherSubject = await prisma.teacherSubject.create({ data });

    return Response.json(
      {
        message: "講師-科目関連を作成しました",
        data: teacherSubject,
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
    return Response.json(
      { error: "講師-科目関連の作成に失敗しました" },
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
        { error: "講師-科目関連が見つかりません" },
        { status: 404 }
      );
    }

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
      message: "講師-科目関連を更新しました",
      data: teacherSubject,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "入力値の検証に失敗しました", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "講師-科目関連の更新に失敗しました" },
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
    const teacherId = searchParams.get("teacherId");
    const subjectId = searchParams.get("subjectId");
    const subjectTypeId = searchParams.get("subjectTypeId");

    if (!teacherId || !subjectId || !subjectTypeId) {
      return Response.json(
        { error: "講師ID、科目ID、科目タイプIDはすべて必須です" },
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
        { error: "講師-科目関連が見つかりません" },
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
      message: "講師-科目関連を削除しました",
    });
  } catch {
    return Response.json(
      { error: "講師-科目関連の削除に失敗しました" },
      { status: 500 }
    );
  }
}
