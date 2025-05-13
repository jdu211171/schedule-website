import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  CreateTeacherSubjectSchema,
  DeleteTeacherSubjectSchema,
  TeacherSubjectQuerySchema,
  UpdateTeacherSubjectSchema,
} from "@/schemas/teacher-subject.schema"; // Corrected import path
import { ZodError } from "zod";
import { Prisma } from '@prisma/client'; // Import Prisma for error types

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 });
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
      return Response.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to get teacher subjects:", error);
    return Response.json(
      { error: "先生の担当科目の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 });
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = CreateTeacherSubjectSchema.parse(body);
    const { teacherId, subjectId, subjectTypeId, notes } = data;

    const teacher = await prisma.teacher.findUnique({
      where: { teacherId },
    });
    if (!teacher) {
      return Response.json({ error: "指定された先生が存在しません" }, { status: 404 });
    }

    const subject = await prisma.subject.findUnique({
      where: { subjectId },
    });
    if (!subject) {
      return Response.json({ error: "指定された科目が存在しません" }, { status: 404 });
    }

    const subjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId },
    });
    if (!subjectType) {
      return Response.json({ error: "指定された科目の種類が存在しません" }, { status: 404 });
    }

    const validPair = await prisma.subjectToSubjectType.findFirst({
      where: {
        subjectId,
        subjectTypeId,
      },
    });

    if (!validPair) {
      return Response.json(
        { error: "指定された科目と科目の種類の組み合わせは無効です" },
        { status: 400 }
      );
    }

    const existingRelation = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectTypeId: { 
          teacherId,
          subjectTypeId,
        },
      },
    });

    if (existingRelation) {
      return Response.json(
        { error: "この先生と科目の種類の組み合わせは既に登録されています" },
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
        message: "先生の担当科目が正常に作成されました",
        data: teacherSubject,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to create teacher subject:", error);
    return Response.json(
      { error: "先生の担当科目の作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 });
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { teacherId, subjectTypeId, subjectId: newSubjectId, notes: newNotes } =
      UpdateTeacherSubjectSchema.parse(body);

    const dataToUpdate: { subjectId?: string; notes?: string | null } = {}; // notes can be null

    if (newSubjectId !== undefined) {
      dataToUpdate.subjectId = newSubjectId;
    }
    // Check if newNotes is explicitly provided (even if null, it's an update)
    if (body.hasOwnProperty('notes')) {
        dataToUpdate.notes = newNotes; // newNotes can be string, undefined, or null from schema
    }

    // Validate newSubjectId if it's being updated
    if (newSubjectId !== undefined) {
      const subject = await prisma.subject.findUnique({
        where: { subjectId: newSubjectId },
      });
      if (!subject) {
        return Response.json({ error: "指定された科目が存在しません" }, { status: 404 });
      }
      const validPair = await prisma.subjectToSubjectType.findFirst({
        where: {
          subjectId: newSubjectId,
          subjectTypeId, 
        },
      });
      if (!validPair) {
        return Response.json(
          { error: "指定された新しい科目と科目の種類の組み合わせは無効です" },
          { status: 400 }
        );
      }
    }

    const updatedTeacherSubject = await prisma.teacherSubject.update({
      where: {
        teacherId_subjectTypeId: {
          teacherId,
          subjectTypeId,
        },
      },
      data: dataToUpdate,
    });

    return Response.json(
      { message: "先生の担当科目が正常に更新されました", data: updatedTeacherSubject },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return Response.json({ error: "更新対象のレコードが見つかりません" }, { status: 404 });
    }
    console.error("Failed to update teacher subject:", error);
    return Response.json(
      { error: "先生の担当科目の更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 });
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { teacherId, subjectTypeId } = DeleteTeacherSubjectSchema.parse(body);

    await prisma.teacherSubject.delete({
      where: {
        teacherId_subjectTypeId: {
          teacherId,
          subjectTypeId,
        },
      },
    });

    return Response.json(
      { message: "先生の担当科目が正常に削除されました" },
      { status: 200 } 
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return Response.json({ error: "削除対象のレコードが見つかりません" }, { status: 404 });
    }
    console.error("Failed to delete teacher subject:", error);
    return Response.json(
      { error: "先生の担当科目の削除に失敗しました" },
      { status: 500 }
    );
  }
}
