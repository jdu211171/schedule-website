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
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json({ error: "Failed to fetch grades" }, { status: 500 });
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
    const data = CreateGradeSchema.parse(body);

    // Check if the studentType exists
    const studentType = await prisma.studentType.findUnique({
      where: { studentTypeId: data.studentTypeId },
    });
    if (!studentType) {
      return Response.json(
        { error: "Student type not found" },
        { status: 404 }
      );
    }

    const grade = await prisma.grade.create({ data });

    return Response.json(
      {
        message: "Grade created successfully",
        data: grade,
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
    return Response.json({ error: "Failed to create grade" }, { status: 500 });
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
    const { gradeId, ...data } = UpdateGradeSchema.parse(body);

    const existingGrade = await prisma.grade.findUnique({
      where: { gradeId },
    });

    if (!existingGrade) {
      return Response.json({ error: "Grade not found" }, { status: 404 });
    }

    // Check if the studentType exists if it's being updated
    if (data.studentTypeId) {
      const studentType = await prisma.studentType.findUnique({
        where: { studentTypeId: data.studentTypeId },
      });
      if (!studentType) {
        return Response.json(
          { error: "Student type not found" },
          { status: 404 }
        );
      }
    }

    const grade = await prisma.grade.update({
      where: { gradeId },
      data,
    });

    return Response.json({
      message: "Grade updated successfully",
      data: grade,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json({ error: "Failed to update grade" }, { status: 500 });
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
    const gradeId = searchParams.get("gradeId");

    if (!gradeId) {
      return Response.json({ error: "Grade ID is required" }, { status: 400 });
    }

    const existingGrade = await prisma.grade.findUnique({
      where: { gradeId },
    });

    if (!existingGrade) {
      return Response.json({ error: "Grade not found" }, { status: 404 });
    }

    // Check for related students before deletion
    const hasRelatedStudents = await prisma.student.findFirst({
      where: { gradeId },
    });

    if (hasRelatedStudents) {
      return Response.json(
        {
          error: "Cannot delete grade with related students",
        },
        { status: 409 }
      );
    }

    await prisma.grade.delete({ where: { gradeId } });

    return Response.json({
      message: "Grade deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting grade:", error);
    return Response.json({ error: "Failed to delete grade" }, { status: 500 });
  }
}
