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
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
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
        subjectToSubjectTypes: {
          include: {
            subject: {
              select: {
                subjectId: true,
                name: true,
              },
            },
          },
        },
        StudentPreferenceSubject: {
          select: {
            id: true,
            studentPreferenceId: true,
            subjectId: true,
          },
          take: 10, // Limit to prevent large response payloads
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
        { error: "無効なクエリパラメータです", details: error.errors }, // "Invalid query parameters"
        { status: 400 }
      );
    }
    console.error("科目タイプの取得エラー:", error); // "Error fetching subject types:"
    return Response.json(
      { error: "科目タイプの取得に失敗しました" }, // "Failed to fetch subject types"
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
    const data = CreateSubjectTypeSchema.parse(body);

    const subjectType = await prisma.subjectType.create({ data });

    return Response.json(
      {
        message: "科目タイプが正常に作成されました", // "Subject type created successfully"
        data: subjectType,
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
    console.error("科目タイプの作成エラー:", error); // "Error creating subject type:"
    return Response.json(
      { error: "科目タイプの作成に失敗しました" }, // "Failed to create subject type"
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
    const { subjectTypeId, ...data } = UpdateSubjectTypeSchema.parse(body);

    const existingSubjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId },
    });

    if (!existingSubjectType) {
      return Response.json(
        { error: "科目タイプが見つかりません" }, // "Subject type not found"
        { status: 404 }
      );
    }

    const subjectType = await prisma.subjectType.update({
      where: { subjectTypeId },
      data,
    });

    return Response.json({
      message: "科目タイプが正常に更新されました", // "Subject type updated successfully"
      data: subjectType,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "検証に失敗しました", details: error.errors }, // "Validation failed"
        { status: 400 }
      );
    }
    console.error("科目タイプの更新エラー:", error); // "Error updating subject type:"
    return Response.json(
      { error: "科目タイプの更新に失敗しました" }, // "Failed to update subject type"
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
    const subjectTypeId = searchParams.get("subjectTypeId");

    if (!subjectTypeId) {
      return Response.json(
        { error: "科目タイプIDは必須です" }, // "Subject type ID is required"
        { status: 400 }
      );
    }

    const existingSubjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId },
      include: {
        subjectToSubjectTypes: true,
        StudentPreferenceSubject: true,
      },
    });

    if (!existingSubjectType) {
      return Response.json(
        { error: "科目タイプが見つかりません" }, // "Subject type not found"
        { status: 404 }
      );
    }

    // Check for related records before deletion
    if (existingSubjectType.subjectToSubjectTypes.length > 0) {
      return Response.json(
        {
          error: "このタイプを参照している科目があるため削除できません", // "Cannot delete because there are subjects referencing this type"
        },
        { status: 409 }
      );
    }

    // Check for related StudentPreferenceSubject records
    if (existingSubjectType.StudentPreferenceSubject.length > 0) {
      return Response.json(
        {
          error:
            "このタイプを参照している生徒の希望科目があるため削除できません", // "Cannot delete because there are student preference subjects referencing this type"
        },
        { status: 409 }
      );
    }

    await prisma.subjectType.delete({ where: { subjectTypeId } });

    return Response.json({
      message: "科目タイプが正常に削除されました", // "Subject type deleted successfully"
    });
  } catch (error) {
    console.error("科目タイプの削除エラー:", error); // "Error deleting subject type:"
    return Response.json(
      { error: "科目タイプの削除に失敗しました" }, // "Failed to delete subject type"
      { status: 500 }
    );
  }
}
