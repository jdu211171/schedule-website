import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  SubjectTypeQuerySchema,
  CreateSubjectTypeSchema,
  UpdateSubjectTypeSchema,
} from "@/schemas/subject-type.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = SubjectTypeQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const { page, limit, name, sort, order } = query;

    const filters: Record<string, unknown> = {};

    if (name) {
      filters.name = { contains: name, mode: "insensitive" };
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[sort] = order;

    const total = await prisma.subjectType.count({ where: filters });

    const subjectTypes = await prisma.subjectType.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy,
      include: {
        subjects: {
          select: {
            subjectId: true,
            name: true,
          },
        },
        StudentPreferenceSubject: {
          select: {
            id: true,
            studentPreferenceId: true,
            subjectId: true,
          },
        },
      },
    });

    return Response.json({
      data: subjectTypes,
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
      { error: "科目タイプの取得に失敗しました" },
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
    const data = CreateSubjectTypeSchema.parse(body);

    const subjectType = await prisma.subjectType.create({ data });

    return Response.json(
      {
        message: "科目タイプを作成しました",
        data: subjectType,
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
      { error: "科目タイプの作成に失敗しました" },
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
    const { subjectTypeId, ...data } = UpdateSubjectTypeSchema.parse(body);

    const existingSubjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId },
    });

    if (!existingSubjectType) {
      return Response.json(
        { error: "科目タイプが見つかりません" },
        { status: 404 }
      );
    }

    const subjectType = await prisma.subjectType.update({
      where: { subjectTypeId },
      data,
    });

    return Response.json({
      message: "科目タイプを更新しました",
      data: subjectType,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "入力値の検証に失敗しました", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "科目タイプの更新に失敗しました" },
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
    const subjectTypeId = searchParams.get("subjectTypeId");

    if (!subjectTypeId) {
      return Response.json(
        { error: "科目タイプIDは必須です" },
        { status: 400 }
      );
    }

    const existingSubjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId },
    });

    if (!existingSubjectType) {
      return Response.json(
        { error: "科目タイプが見つかりません" },
        { status: 404 }
      );
    }

    // Check for related subjects before deletion
    const hasRelatedSubjects = await prisma.subject.findFirst({
      where: { subjectTypeId },
    });

    if (hasRelatedSubjects) {
      return Response.json(
        {
          error: "このタイプを参照している科目があるため削除できません",
        },
        { status: 409 }
      );
    }

    // Check for related StudentPreferenceSubject records
    const hasRelatedStudentPreferences =
      await prisma.studentPreferenceSubject.findFirst({
        where: { subjectTypeId },
      });

    if (hasRelatedStudentPreferences) {
      return Response.json(
        {
          error:
            "このタイプを参照している生徒の希望科目があるため削除できません",
        },
        { status: 409 }
      );
    }

    await prisma.subjectType.delete({ where: { subjectTypeId } });

    return Response.json({
      message: "科目タイプを削除しました",
    });
  } catch (error) {
    console.error("Error deleting subject type:", error);
    return Response.json(
      { error: "科目タイプの削除に失敗しました" },
      { status: 500 }
    );
  }
}
