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
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Failed to fetch subject types" },
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
        message: "Subject type created successfully",
        data: subjectType,
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
      { error: "Failed to create subject type" },
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
        { error: "Subject type not found" },
        { status: 404 }
      );
    }

    const subjectType = await prisma.subjectType.update({
      where: { subjectTypeId },
      data,
    });

    return Response.json({
      message: "Subject type updated successfully",
      data: subjectType,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Failed to update subject type" },
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
        { error: "Subject type ID is required" },
        { status: 400 }
      );
    }

    const existingSubjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId },
    });

    if (!existingSubjectType) {
      return Response.json(
        { error: "Subject type not found" },
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
          error: "Cannot delete subject type with related subjects",
        },
        { status: 409 }
      );
    }

    await prisma.subjectType.delete({ where: { subjectTypeId } });

    return Response.json({
      message: "Subject type deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting subject type:", error);
    return Response.json(
      { error: "Failed to delete subject type" },
      { status: 500 }
    );
  }
}
