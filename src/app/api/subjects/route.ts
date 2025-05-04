import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  SubjectQuerySchema,
  CreateSubjectSchema,
  UpdateSubjectSchema,
} from "@/schemas/subject.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = SubjectQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const { page, limit, name, subjectTypeId, sort, order } = query;

    const filters: Record<string, unknown> = {};

    if (name) {
      filters.name = { contains: name, mode: "insensitive" };
    }

    if (subjectTypeId) {
      filters.subjectTypeId = subjectTypeId;
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[sort] = order;

    const total = await prisma.subject.count({ where: filters });

    const subjects = await prisma.subject.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy,
      include: {
        subjectType: {
          select: {
            name: true,
          },
        },
      },
    });

    return Response.json({
      data: subjects,
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
      { error: "Failed to fetch subjects" },
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
    const data = CreateSubjectSchema.parse(body);

    // Verify that the subject type exists
    const subjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId: data.subjectTypeId },
    });

    if (!subjectType) {
      return Response.json(
        { error: "Subject type not found" },
        { status: 404 }
      );
    }

    const subject = await prisma.subject.create({ data });

    return Response.json(
      {
        message: "Subject created successfully",
        data: subject,
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
      { error: "Failed to create subject" },
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
    const { subjectId, ...data } = UpdateSubjectSchema.parse(body);

    // Check if the subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { subjectId },
    });

    if (!existingSubject) {
      return Response.json({ error: "Subject not found" }, { status: 404 });
    }

    // If subject type ID is being changed, verify it exists
    if (
      data.subjectTypeId &&
      data.subjectTypeId !== existingSubject.subjectTypeId
    ) {
      const subjectType = await prisma.subjectType.findUnique({
        where: { subjectTypeId: data.subjectTypeId },
      });

      if (!subjectType) {
        return Response.json(
          { error: "Subject type not found" },
          { status: 404 }
        );
      }
    }

    const subject = await prisma.subject.update({
      where: { subjectId },
      data,
    });

    return Response.json({
      message: "Subject updated successfully",
      data: subject,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Failed to update subject" },
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
    const subjectId = searchParams.get("subjectId");

    if (!subjectId) {
      return Response.json(
        { error: "Subject ID is required" },
        { status: 400 }
      );
    }

    const existingSubject = await prisma.subject.findUnique({
      where: { subjectId },
    });

    if (!existingSubject) {
      return Response.json({ error: "Subject not found" }, { status: 404 });
    }

    // Check for related records before deletion
    const hasRelatedClassSessions = await prisma.classSession.findFirst({
      where: { subjectId },
    });

    const hasRelatedTemplates = await prisma.regularClassTemplate.findFirst({
      where: { subjectId },
    });

    const hasRelatedTeacherSubjects = await prisma.teacherSubject.findFirst({
      where: { subjectId },
    });

    const hasRelatedStudentPreferences =
      await prisma.studentPreferenceSubject.findFirst({
        where: { subjectId },
      });

    if (
      hasRelatedClassSessions ||
      hasRelatedTemplates ||
      hasRelatedTeacherSubjects ||
      hasRelatedStudentPreferences
    ) {
      return Response.json(
        {
          error:
            "Cannot delete subject with related records (class sessions, templates, teacher subjects, or student preferences)",
        },
        { status: 409 }
      );
    }

    await prisma.subject.delete({ where: { subjectId } });

    return Response.json({
      message: "Subject deleted successfully",
    });
  } catch {
    return Response.json(
      { error: "Failed to delete subject" },
      { status: 500 }
    );
  }
}
