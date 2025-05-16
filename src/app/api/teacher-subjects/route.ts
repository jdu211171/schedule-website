import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  CreateTeacherSubjectSchema,
  DeleteTeacherSubjectSchema,
  TeacherSubjectQuerySchema,
  UpdateTeacherSubjectSchema,
} from "@/schemas/teacher-subject.schema"; // Corrected import path
import { ZodError } from "zod";
import { Prisma } from "@prisma/client"; // Import Prisma for error types

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

    // Define filters for teacher-subject relationships
    const tsFilters: Record<string, unknown> = {};

    if (teacherId) {
      tsFilters.teacherId = teacherId;
    }

    if (subjectId) {
      tsFilters.subjectId = subjectId;
    }

    if (subjectTypeId) {
      tsFilters.subjectTypeId = subjectTypeId;
    }

    // First, get all teachers that have at least one subject matching the filters
    const teachers = await prisma.teacher.findMany({
      where: {
        teacherSubjects: {
          some: tsFilters,
        },
      },
      select: {
        teacherId: true,
        name: true,
      },
      orderBy: {
        // Default to sorting by name
        name: order as "asc" | "desc",
      },
    });

    const total = teachers.length;

    // Apply pagination to teachers
    const paginatedTeachers = teachers.slice((page - 1) * limit, page * limit);
    const paginatedTeacherIds = paginatedTeachers.map((t) => t.teacherId);

    // Now get all teacher-subject relationships for the paginated teachers
    // That match the original filters
    const teacherSubjects = await prisma.teacherSubject.findMany({
      where: {
        teacherId: {
          in: paginatedTeacherIds,
        },
        ...(subjectId ? { subjectId } : {}),
        ...(subjectTypeId ? { subjectTypeId } : {}),
      },
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
      orderBy: [
        {
          teacherId: "asc", // Group by teacher
        },
        {
          subject: {
            name: "asc", // Then by subject name
          },
        },
      ],
    });

    return Response.json({
      data: teacherSubjects,
      pagination: {
        total, // This is now the count of teachers, not teacher-subject relationships
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
      return Response.json(
        { error: "指定された先生が存在しません" },
        { status: 404 }
      );
    }

    const subject = await prisma.subject.findUnique({
      where: { subjectId },
    });
    if (!subject) {
      return Response.json(
        { error: "指定された科目が存在しません" },
        { status: 404 }
      );
    }

    const subjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId },
    });
    if (!subjectType) {
      return Response.json(
        { error: "指定された科目の種類が存在しません" },
        { status: 404 }
      );
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

    // Update: check for existing relation using all three fields
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
        {
          error: "この先生・科目・科目の種類の組み合わせは既に登録されています",
        },
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
    // Accept subjectId as required for composite PK
    const parsed = UpdateTeacherSubjectSchema.parse(body);
    const { teacherId, subjectTypeId } = parsed;
    // subjectId is required for composite PK
    const subjectId = parsed.subjectId;
    const newSubjectId = parsed.subjectId; // for update
    const newNotes = parsed.notes;

    if (!subjectId) {
      return Response.json({ error: "subjectId is required" }, { status: 400 });
    }

    const dataToUpdate: { subjectId?: string; notes?: string | null } = {}; // notes can be null

    if (newSubjectId !== undefined) {
      dataToUpdate.subjectId = newSubjectId;
    }
    // Check if newNotes is explicitly provided (even if null, it's an update)
    if (body.hasOwnProperty("notes")) {
      dataToUpdate.notes = newNotes; // newNotes can be string, undefined, or null from schema
    }

    // Validate newSubjectId if it's being updated
    if (newSubjectId !== undefined) {
      const subject = await prisma.subject.findUnique({
        where: { subjectId: newSubjectId },
      });
      if (!subject) {
        return Response.json(
          { error: "指定された科目が存在しません" },
          { status: 404 }
        );
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

    // Use all three fields for composite PK
    const updatedTeacherSubject = await prisma.teacherSubject.update({
      where: {
        teacherId_subjectId_subjectTypeId: {
          teacherId,
          subjectId,
          subjectTypeId,
        },
      },
      data: dataToUpdate,
    });

    return Response.json(
      {
        message: "先生の担当科目が正常に更新されました",
        data: updatedTeacherSubject,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json(
        { error: "更新対象のレコードが見つかりません" },
        { status: 404 }
      );
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
    // Get parameters from URL instead of body
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacherId");
    const subjectId = searchParams.get("subjectId");
    const subjectTypeId = searchParams.get("subjectTypeId");

    // Validate required parameters
    if (!teacherId || !subjectId || !subjectTypeId) {
      return Response.json(
        {
          error: "講師ID、科目ID、科目タイプIDはすべて必須です",
        },
        { status: 400 }
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

    return Response.json(
      { message: "先生の担当科目が正常に削除されました" },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json(
        { error: "削除対象のレコードが見つかりません" },
        { status: 404 }
      );
    }
    console.error("Failed to delete teacher subject:", error);
    return Response.json(
      { error: "先生の担当科目の削除に失敗しました" },
      { status: 500 }
    );
  }
}
