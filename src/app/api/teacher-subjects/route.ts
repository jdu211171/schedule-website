import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  TeacherSubjectQuerySchema,
  CreateTeacherSubjectSchema,
  UpdateTeacherSubjectSchema,
} from "@/schemas/teacher-subject.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = TeacherSubjectQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const { page, limit, teacherId, subjectId, sort, order } = query;

    const filters: Record<string, unknown> = {};

    if (teacherId) {
      filters.teacherId = teacherId;
    }

    if (subjectId) {
      filters.subjectId = subjectId;
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[sort] = order;

    const total = await prisma.teacherSubject.count({ where: filters });

    const teacherSubjects = await prisma.teacherSubject.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy,
      include: {
        teacher: {
          select: {
            name: true,
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
      },
    });

    return Response.json({
      data: teacherSubjects,
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
      { error: "Failed to fetch teacher subjects" },
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
    const data = CreateTeacherSubjectSchema.parse(body);

    // Check if the teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { teacherId: data.teacherId },
    });
    if (!teacher) {
      return Response.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Check if the subject exists
    const subject = await prisma.subject.findUnique({
      where: { subjectId: data.subjectId },
    });
    if (!subject) {
      return Response.json({ error: "Subject not found" }, { status: 404 });
    }

    // Check if the teacher-subject relation already exists
    const existingRelation = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId: data.teacherId,
          subjectId: data.subjectId,
        },
      },
    });

    if (existingRelation) {
      return Response.json(
        { error: "Teacher-subject relation already exists" },
        { status: 409 }
      );
    }

    const teacherSubject = await prisma.teacherSubject.create({ data });

    return Response.json(
      {
        message: "Teacher subject created successfully",
        data: teacherSubject,
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
      { error: "Failed to create teacher subject" },
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
    const { teacherId, subjectId, ...data } =
      UpdateTeacherSubjectSchema.parse(body);

    // Check if the teacher-subject relation exists
    const existingRelation = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId,
          subjectId,
        },
      },
    });

    if (!existingRelation) {
      return Response.json(
        { error: "Teacher subject not found" },
        { status: 404 }
      );
    }

    const teacherSubject = await prisma.teacherSubject.update({
      where: {
        teacherId_subjectId: {
          teacherId,
          subjectId,
        },
      },
      data,
    });

    return Response.json({
      message: "Teacher subject updated successfully",
      data: teacherSubject,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Failed to update teacher subject" },
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
    const teacherId = searchParams.get("teacherId");
    const subjectId = searchParams.get("subjectId");

    if (!teacherId || !subjectId) {
      return Response.json(
        { error: "Teacher ID and Subject ID are required" },
        { status: 400 }
      );
    }

    const existingRelation = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId,
          subjectId,
        },
      },
    });

    if (!existingRelation) {
      return Response.json(
        { error: "Teacher subject not found" },
        { status: 404 }
      );
    }

    await prisma.teacherSubject.delete({
      where: {
        teacherId_subjectId: {
          teacherId,
          subjectId,
        },
      },
    });

    return Response.json({
      message: "Teacher subject deleted successfully",
    });
  } catch {
    return Response.json(
      { error: "Failed to delete teacher subject" },
      { status: 500 }
    );
  }
}
