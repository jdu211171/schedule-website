import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  GradeQuerySchema,
  CreateGradeSchema,
  UpdateGradeSchema,
} from "@/schemas/grade.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = GradeQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const { page, limit, name, studentTypeId, gradeYear, sort, order } = query;

    const filters: Record<string, unknown> = {};

    if (name) {
      filters.name = { contains: name, mode: "insensitive" };
    }

    if (studentTypeId) {
      filters.studentTypeId = studentTypeId;
    }

    if (gradeYear !== undefined) {
      filters.gradeYear = gradeYear;
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[sort] = order;

    const total = await prisma.grade.count({ where: filters });

    const grades = await prisma.grade.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy,
      include: {
        studentType: {
          select: {
            name: true,
          },
        },
      },
    });

    return Response.json({
      data: grades,
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
    return Response.json({ error: "学年の取得に失敗しました" }, { status: 500 }); // "Failed to fetch grades"
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
    const data = CreateGradeSchema.parse(body);

    // Check if the studentType exists
    const studentType = await prisma.studentType.findUnique({
      where: { studentTypeId: data.studentTypeId },
    });
    if (!studentType) {
      return Response.json(
        { error: "生徒タイプが見つかりません" }, // "Student type not found"
        { status: 404 }
      );
    }

    const grade = await prisma.grade.create({ data });
    // Fetch the grade with studentType relation for response
    const gradeWithStudentType = await prisma.grade.findUnique({
      where: { gradeId: grade.gradeId },
      include: {
        studentType: {
          select: { name: true },
        },
      },
    });

    return Response.json(
      {
        message: "学年が正常に作成されました", // "Grade created successfully"
        data: gradeWithStudentType,
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
    return Response.json({ error: "学年の作成に失敗しました" }, { status: 500 }); // "Failed to create grade"
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
    const { gradeId, ...data } = UpdateGradeSchema.parse(body);

    const existingGrade = await prisma.grade.findUnique({
      where: { gradeId },
    });

    if (!existingGrade) {
      return Response.json({ error: "学年が見つかりません" }, { status: 404 }); // "Grade not found"
    }

    // Check if the studentType exists if it's being updated
    if (data.studentTypeId) {
      const studentType = await prisma.studentType.findUnique({
        where: { studentTypeId: data.studentTypeId },
      });
      if (!studentType) {
        return Response.json(
          { error: "生徒タイプが見つかりません" }, // "Student type not found"
          { status: 404 }
        );
      }
    }

    const grade = await prisma.grade.update({
      where: { gradeId },
      data,
    });
    // Fetch the grade with studentType relation for response
    const gradeWithStudentType = await prisma.grade.findUnique({
      where: { gradeId: grade.gradeId },
      include: {
        studentType: {
          select: { name: true },
        },
      },
    });

    return Response.json({
      message: "学年が正常に更新されました", // "Grade updated successfully"
      data: gradeWithStudentType,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "検証に失敗しました", details: error.errors }, // "Validation failed"
        { status: 400 }
      );
    }
    return Response.json({ error: "学年の更新に失敗しました" }, { status: 500 }); // "Failed to update grade"
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
    const gradeId = searchParams.get("gradeId");

    if (!gradeId) {
      return Response.json({ error: "学年IDは必須です" }, { status: 400 }); // "Grade ID is required"
    }

    const existingGrade = await prisma.grade.findUnique({
      where: { gradeId },
    });

    if (!existingGrade) {
      return Response.json({ error: "学年が見つかりません" }, { status: 404 }); // "Grade not found"
    }

    // Check for related students before deletion
    const hasRelatedStudents = await prisma.student.findFirst({
      where: { gradeId },
    });

    if (hasRelatedStudents) {
      return Response.json(
        {
          error: "関連する生徒がいるため、学年を削除できません", // "Cannot delete grade with related students"
        },
        { status: 409 }
      );
    }

    await prisma.grade.delete({ where: { gradeId } });

    return Response.json({
      message: "学年が正常に削除されました", // "Grade deleted successfully"
    });
  } catch (error) {
    console.error("学年の削除エラー:", error); // "Error deleting grade:"
    return Response.json({ error: "学年の削除に失敗しました" }, { status: 500 }); // "Failed to delete grade"
  }
}
