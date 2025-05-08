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

    // Filter by subjectTypeId through the join table if provided
    let whereCondition: Record<string, unknown> = { ...filters };
    if (subjectTypeId) {
      whereCondition = {
        ...whereCondition,
        subjectToSubjectTypes: {
          some: {
            subjectTypeId,
          },
        },
      };
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[sort] = order;

    const total = await prisma.subject.count({ where: whereCondition });

    const subjects = await prisma.subject.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      include: {
        subjectToSubjectTypes: {
          include: {
            subjectType: true,
          },
        },
        classSessions: { include: { classType: true } },
        regularClassTemplates: true,
        teacherSubjects: true,
        StudentPreferenceSubject: true,
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
    const { subjectTypeIds, ...subjectData } = data;

    // Verify that all subject types exist
    const existingSubjectTypes = await prisma.subjectType.findMany({
      where: {
        subjectTypeId: {
          in: subjectTypeIds,
        },
      },
    });

    if (existingSubjectTypes.length !== subjectTypeIds.length) {
      return Response.json(
        { error: "One or more subject types not found" },
        { status: 404 }
      );
    }

    // Use a transaction to ensure both the subject and its relationships are created
    const subject = await prisma.$transaction(async (tx) => {
      // Create the subject
      const newSubject = await tx.subject.create({
        data: subjectData,
      });

      // Create the subject-to-subject-type relationships
      await Promise.all(
        subjectTypeIds.map((subjectTypeId) =>
          tx.subjectToSubjectType.create({
            data: {
              subjectId: newSubject.subjectId,
              subjectTypeId,
            },
          })
        )
      );

      // Return the created subject with its relationships
      return await tx.subject.findUnique({
        where: { subjectId: newSubject.subjectId },
        include: {
          subjectToSubjectTypes: {
            include: {
              subjectType: true,
            },
          },
          classSessions: { include: { classType: true } },
          regularClassTemplates: true,
          teacherSubjects: true,
          StudentPreferenceSubject: true,
        },
      });
    });

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
    console.error("Error creating subject:", error);
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
    const { subjectId, subjectTypeIds, ...data } =
      UpdateSubjectSchema.parse(body);

    // Check if the subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { subjectId },
      include: {
        subjectToSubjectTypes: true,
      },
    });

    if (!existingSubject) {
      return Response.json({ error: "Subject not found" }, { status: 404 });
    }

    // If subject type IDs are being updated, verify they exist
    if (subjectTypeIds) {
      const existingSubjectTypes = await prisma.subjectType.findMany({
        where: {
          subjectTypeId: {
            in: subjectTypeIds,
          },
        },
      });

      if (existingSubjectTypes.length !== subjectTypeIds.length) {
        return Response.json(
          { error: "One or more subject types not found" },
          { status: 404 }
        );
      }
    }

    // Use a transaction to update both the subject and its relationships
    const subject = await prisma.$transaction(async (tx) => {
      // Update the subject
      const updatedSubject = await tx.subject.update({
        where: { subjectId },
        data,
      });

      // Update subject-to-subject-type relationships if provided
      if (subjectTypeIds) {
        // Delete existing relationships
        await tx.subjectToSubjectType.deleteMany({
          where: { subjectId },
        });

        // Create new relationships
        await Promise.all(
          subjectTypeIds.map((subjectTypeId) =>
            tx.subjectToSubjectType.create({
              data: {
                subjectId,
                subjectTypeId,
              },
            })
          )
        );
      }

      // Return the updated subject with its relationships
      return await tx.subject.findUnique({
        where: { subjectId: updatedSubject.subjectId },
        include: {
          subjectToSubjectTypes: {
            include: {
              subjectType: true,
            },
          },
          classSessions: { include: { classType: true } },
          regularClassTemplates: true,
          teacherSubjects: true,
          StudentPreferenceSubject: true,
        },
      });
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
    console.error("Error updating subject:", error);
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

    // Use a transaction to delete both the subject and its relationships
    await prisma.$transaction(async (tx) => {
      // Delete subject-to-subject-type relationships
      await tx.subjectToSubjectType.deleteMany({
        where: { subjectId },
      });

      // Delete the subject
      await tx.subject.delete({ where: { subjectId } });
    });

    return Response.json({
      message: "Subject deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting subject:", error);
    return Response.json(
      { error: "Failed to delete subject" },
      { status: 500 }
    );
  }
}
