import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  StudentQuerySchema,
  CreateStudentSchema,
  UpdateStudentSchema,
} from "@/schemas/student.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = StudentQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const {
      page,
      limit,
      name,
      gradeName, // Changed from gradeId to gradeName
      schoolName,
      schoolType,
      examSchoolType,
      sort,
      order,
    } = query;

    // Build the where clause for the query
    const where: Record<string, unknown> = {};

    if (name) {
      where.name = { contains: name, mode: "insensitive" };
    }

    if (schoolName) {
      where.schoolName = { contains: schoolName, mode: "insensitive" };
    }

    if (schoolType) {
      where.schoolType = schoolType;
    }

    if (examSchoolType) {
      where.examSchoolType = examSchoolType;
    }

    // Handle filtering by grade name using a different approach
    if (gradeName) {
      where.grade = {
        name: { contains: gradeName, mode: "insensitive" },
      };
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[sort] = order;

    const total = await prisma.student.count({ where });

    const students = await prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        grade: true,
      },
    });

    return Response.json({
      data: students,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Failed to fetch students" },
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
    const data = CreateStudentSchema.parse(body);

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!userExists) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user already has a student profile
    const existingStudent = await prisma.student.findUnique({
      where: { userId: data.userId },
    });

    if (existingStudent) {
      return Response.json(
        { error: "User already has a student profile" },
        { status: 409 }
      );
    }

    // If gradeId is provided, check if grade exists
    if (data.gradeId) {
      const gradeExists = await prisma.grade.findUnique({
        where: { gradeId: data.gradeId },
      });

      if (!gradeExists) {
        return Response.json({ error: "Grade not found" }, { status: 404 });
      }
    }

    const student = await prisma.student.create({ data });

    return Response.json(
      {
        message: "Student created successfully",
        data: student,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating student:", error);
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Failed to create student" },
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
    const { studentId, ...data } = UpdateStudentSchema.parse(body);

    const existingStudent = await prisma.student.findUnique({
      where: { studentId },
    });

    if (!existingStudent) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    // If gradeId is provided, check if grade exists
    if (data.gradeId) {
      const gradeExists = await prisma.grade.findUnique({
        where: { gradeId: data.gradeId },
      });

      if (!gradeExists) {
        return Response.json({ error: "Grade not found" }, { status: 404 });
      }
    }

    const student = await prisma.student.update({
      where: { studentId },
      data,
    });

    return Response.json({
      message: "Student updated successfully",
      data: student,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Failed to update student" },
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
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return Response.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const existingStudent = await prisma.student.findUnique({
      where: { studentId },
    });

    if (!existingStudent) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    // Check for related records
    const hasRelatedClassSessions = await prisma.classSession.findFirst({
      where: { studentId },
    });

    const hasRelatedEnrollments = await prisma.studentClassEnrollment.findFirst(
      {
        where: { studentId },
      }
    );

    const hasRelatedAssignments =
      await prisma.templateStudentAssignment.findFirst({
        where: { studentId },
      });

    const hasRelatedPreferences = await prisma.studentPreference.findFirst({
      where: { studentId },
    });

    if (
      hasRelatedClassSessions ||
      hasRelatedEnrollments ||
      hasRelatedAssignments ||
      hasRelatedPreferences
    ) {
      return Response.json(
        {
          error:
            "Cannot delete student with related records. Please remove all associated data first.",
        },
        { status: 409 }
      );
    }

    // Using transaction to delete user and student together
    await prisma.$transaction([
      prisma.student.delete({ where: { studentId } }),
      prisma.user.delete({ where: { id: existingStudent.userId } }),
    ]);

    return Response.json({
      message: "Student deleted successfully",
    });
  } catch {
    return Response.json(
      { error: "Failed to delete student" },
      { status: 500 }
    );
  }
}
