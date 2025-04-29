import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  CreateStudentTypeSchema,
  StudentTypeQuerySchema,
  UpdateStudentTypeSchema,
} from "@/schemas/student-type.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = StudentTypeQuerySchema.parse(
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

    const total = await prisma.studentType.count({ where: filters });

    const studentTypes = await prisma.studentType.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy,
      include: {
        Grade: {
          select: {
            gradeId: true,
            name: true,
            gradeYear: true,
          },
        },
      },
    });

    return Response.json({
      data: studentTypes,
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
      { error: "Failed to fetch student types" },
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
    const data = CreateStudentTypeSchema.parse(body);

    const studentType = await prisma.studentType.create({ data });

    return Response.json(
      {
        message: "Student type created successfully",
        data: studentType,
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
      { error: "Failed to create student type" },
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
    const { studentTypeId, ...data } = UpdateStudentTypeSchema.parse(body);

    const existingStudentType = await prisma.studentType.findUnique({
      where: { studentTypeId },
    });

    if (!existingStudentType) {
      return Response.json(
        { error: "Student type not found" },
        { status: 404 }
      );
    }

    const studentType = await prisma.studentType.update({
      where: { studentTypeId },
      data,
    });

    return Response.json({
      message: "Student type updated successfully",
      data: studentType,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Failed to update student type" },
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
    const studentTypeId = searchParams.get("studentTypeId");

    if (!studentTypeId) {
      return Response.json(
        { error: "Student type ID is required" },
        { status: 400 }
      );
    }

    const existingStudentType = await prisma.studentType.findUnique({
      where: { studentTypeId },
    });

    if (!existingStudentType) {
      return Response.json(
        { error: "Student type not found" },
        { status: 404 }
      );
    }

    // Check for related grades before deletion
    const hasRelatedGrades = await prisma.grade.findFirst({
      where: { studentTypeId },
    });

    if (hasRelatedGrades) {
      return Response.json(
        {
          error: "Cannot delete student type with related grades",
        },
        { status: 409 }
      );
    }

    await prisma.studentType.delete({ where: { studentTypeId } });

    return Response.json({
      message: "Student type deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting student type:", error);
    return Response.json(
      { error: "Failed to delete student type" },
      { status: 500 }
    );
  }
}
