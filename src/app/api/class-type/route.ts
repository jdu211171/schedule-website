import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ClassTypeQuerySchema,
  CreateClassTypeSchema,
  UpdateClassTypeSchema,
} from "@/schemas/class-type.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = ClassTypeQuerySchema.parse(
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

    const total = await prisma.classType.count({ where: filters });

    const classTypes = await prisma.classType.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy,
    });

    return Response.json({
      data: classTypes,
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
      { error: "Failed to fetch class types" },
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
    const data = CreateClassTypeSchema.parse(body);

    const classType = await prisma.classType.create({ data });

    return Response.json(
      {
        message: "Class type created successfully",
        data: classType,
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
      { error: "Failed to create class type" },
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
    const { classTypeId, ...data } = UpdateClassTypeSchema.parse(body);

    const existingClassType = await prisma.classType.findUnique({
      where: { classTypeId },
    });

    if (!existingClassType) {
      return Response.json({ error: "Class type not found" }, { status: 404 });
    }

    const classType = await prisma.classType.update({
      where: { classTypeId },
      data,
    });

    return Response.json({
      message: "Class type updated successfully",
      data: classType,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Failed to update class type" },
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
    const classTypeId = searchParams.get("classTypeId");

    if (!classTypeId) {
      return Response.json(
        { error: "Class type ID is required" },
        { status: 400 }
      );
    }

    const existingClassType = await prisma.classType.findUnique({
      where: { classTypeId },
    });

    if (!existingClassType) {
      return Response.json({ error: "Class type not found" }, { status: 404 });
    }

    // Check for related records
    const hasRelatedClassSessions = await prisma.classSession.findFirst({
      where: { classTypeId },
    });

    const hasRelatedStudentPreferences =
      await prisma.studentPreference.findFirst({
        where: { classTypeId },
      });

    if (hasRelatedClassSessions || hasRelatedStudentPreferences) {
      return Response.json(
        {
          error:
            "Cannot delete class type with related class sessions or student preferences",
        },
        { status: 409 }
      );
    }

    await prisma.classType.delete({ where: { classTypeId } });

    return Response.json({
      message: "Class type deleted successfully",
    });
  } catch {
    return Response.json(
      { error: "Failed to delete class type" },
      { status: 500 }
    );
  }
}
