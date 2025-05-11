import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  EvaluationQuerySchema,
  CreateEvaluationSchema,
  UpdateEvaluationSchema,
} from "@/schemas/evaluation.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = EvaluationQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const { page, limit, name, score, sort, order } = query;

    const filters: Record<string, unknown> = {};

    if (name) {
      filters.name = { contains: name, mode: "insensitive" };
    }

    if (score !== undefined) {
      filters.score = score;
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[sort] = order;

    const total = await prisma.evaluation.count({ where: filters });

    const evaluations = await prisma.evaluation.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy,
    });

    return Response.json({
      data: evaluations,
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
      { error: "評価の取得に失敗しました" }, // "Failed to fetch evaluations"
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
    const data = CreateEvaluationSchema.parse(body);

    const evaluation = await prisma.evaluation.create({ data });

    return Response.json(
      {
        message: "評価が正常に作成されました", // "Evaluation created successfully"
        data: evaluation,
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
      { error: "評価の作成に失敗しました" }, // "Failed to create evaluation"
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
    const { evaluationId, ...data } = UpdateEvaluationSchema.parse(body);

    const existingEvaluation = await prisma.evaluation.findUnique({
      where: { evaluationId },
    });

    if (!existingEvaluation) {
      return Response.json({ error: "評価が見つかりません" }, { status: 404 }); // "Evaluation not found"
    }

    const evaluation = await prisma.evaluation.update({
      where: { evaluationId },
      data,
    });

    return Response.json({
      message: "評価が正常に更新されました", // "Evaluation updated successfully"
      data: evaluation,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "検証に失敗しました", details: error.errors }, // "Validation failed"
        { status: 400 }
      );
    }
    return Response.json(
      { error: "評価の更新に失敗しました" }, // "Failed to update evaluation"
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
    const evaluationId = searchParams.get("evaluationId");

    if (!evaluationId) {
      return Response.json(
        { error: "評価IDは必須です" }, // "Evaluation ID is required"
        { status: 400 }
      );
    }

    const existingEvaluation = await prisma.evaluation.findUnique({
      where: { evaluationId },
    });

    if (!existingEvaluation) {
      return Response.json({ error: "評価が見つかりません" }, { status: 404 }); // "Evaluation not found"
    }

    // Check for related records (teachers using this evaluation)
    const hasRelatedTeachers = await prisma.teacher.findFirst({
      where: { evaluationId },
    });

    if (hasRelatedTeachers) {
      return Response.json(
        {
          error: "関連する講師がいるため、評価を削除できません", // "Cannot delete evaluation with related teachers"
        },
        { status: 409 }
      );
    }

    await prisma.evaluation.delete({ where: { evaluationId } });

    return Response.json({
      message: "評価が正常に削除されました", // "Evaluation deleted successfully"
    });
  } catch {
    return Response.json(
      { error: "評価の削除に失敗しました" }, // "Failed to delete evaluation"
      { status: 500 }
    );
  }
}
