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
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Failed to fetch evaluations" },
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
    const data = CreateEvaluationSchema.parse(body);

    const evaluation = await prisma.evaluation.create({ data });

    return Response.json(
      {
        message: "Evaluation created successfully",
        data: evaluation,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Failed to create evaluation" },
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
    const { evaluationId, ...data } = UpdateEvaluationSchema.parse(body);

    const existingEvaluation = await prisma.evaluation.findUnique({
      where: { evaluationId },
    });

    if (!existingEvaluation) {
      return Response.json({ error: "Evaluation not found" }, { status: 404 });
    }

    const evaluation = await prisma.evaluation.update({
      where: { evaluationId },
      data,
    });

    return Response.json({
      message: "Evaluation updated successfully",
      data: evaluation,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Failed to update evaluation" },
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
    const evaluationId = searchParams.get("evaluationId");

    if (!evaluationId) {
      return Response.json(
        { error: "Evaluation ID is required" },
        { status: 400 }
      );
    }

    const existingEvaluation = await prisma.evaluation.findUnique({
      where: { evaluationId },
    });

    if (!existingEvaluation) {
      return Response.json({ error: "Evaluation not found" }, { status: 404 });
    }

    // Check for related records (teachers using this evaluation)
    const hasRelatedTeachers = await prisma.teacher.findFirst({
      where: { evaluationId },
    });

    if (hasRelatedTeachers) {
      return Response.json(
        {
          error: "Cannot delete evaluation with related teachers",
        },
        { status: 409 }
      );
    }

    await prisma.evaluation.delete({ where: { evaluationId } });

    return Response.json({
      message: "Evaluation deleted successfully",
    });
  } catch {
    return Response.json(
      { error: "Failed to delete evaluation" },
      { status: 500 }
    );
  }
}
