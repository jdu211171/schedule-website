import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  CreateUserTeacherSchema,
  TeacherQuerySchema,
  UpdateTeacherWithSubjectsSchema,
} from "@/schemas/teacher.schema";
import { DayOfWeek } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const paramsObj: Record<string, unknown> = {};

    // Handle potential array parameters
    for (const key of ["subjectId", "evaluationId"]) {
      const values = searchParams.getAll(key);
      if (values.length > 0) {
        paramsObj[key] = values.length === 1 ? values[0] : values;
      }
    }

    // Add all other parameters
    for (const [key, value] of searchParams.entries()) {
      if (key !== "subjectId" && key !== "evaluationId") {
        paramsObj[key] = value;
      }
    }

    const query = TeacherQuerySchema.parse(paramsObj);
    const {
      page,
      limit,
      name,
      email,
      university,
      enrollmentStatus,
      subjectId,
      evaluationId,
      sort,
      order,
    } = query;

    const filters: Record<string, unknown> = {};

    if (name) {
      filters.name = { contains: name, mode: "insensitive" };
    }

    if (email) {
      filters.email = { contains: email, mode: "insensitive" };
    }

    if (university) {
      filters.university = { contains: university, mode: "insensitive" };
    }

    if (enrollmentStatus) {
      filters.enrollmentStatus = {
        contains: enrollmentStatus,
        mode: "insensitive",
      };
    }

    // Handle evaluationId filtering
    if (evaluationId) {
      // If evaluationId is an array, filter for teachers with evaluationId in the array
      if (Array.isArray(evaluationId)) {
        filters.evaluationId = {
          in: evaluationId,
        };
      } else {
        // If evaluationId is a string, filter for exact match
        filters.evaluationId = evaluationId;
      }
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[sort] = order;

    let teacherQuery = {
      where: filters,
      skip,
      take: limit,
      orderBy,
      include: {
        evaluation: true,
        teacherSubjects: {
          include: {
            subject: {
              include: {
                subjectToSubjectTypes: {
                  include: {
                    subjectType: true,
                  },
                },
              },
            },
            subjectType: true,
          },
        },
        TeacherShiftReference: true,
      },
    };

    // If subjectId is provided, adjust the query to filter teachers
    // who teach the specified subject(s)
    if (subjectId) {
      if (Array.isArray(subjectId)) {
        // For multiple subjects, find teachers who teach ANY of the specified subjects
        teacherQuery = {
          ...teacherQuery,
          where: {
            ...teacherQuery.where,
            teacherSubjects: {
              some: {
                subjectId: {
                  in: subjectId,
                },
              },
            },
          },
        };
      } else {
        // For a single subject
        teacherQuery = {
          ...teacherQuery,
          where: {
            ...teacherQuery.where,
            teacherSubjects: {
              some: {
                subjectId,
              },
            },
          },
        };
      }
    }

    const total = await prisma.teacher.count({
      where: teacherQuery.where,
    });

    const teachers = await prisma.teacher.findMany(teacherQuery);

    return Response.json({
      data: teachers,
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
      { error: "Failed to fetch teachers" },
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

    // Validate the combined user/teacher data
    const validatedData = CreateUserTeacherSchema.parse(body);

    const { username, password, subjects, shifts, ...teacherData } =
      validatedData;

    // Check if username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return Response.json(
        {
          error: "Username already taken",
          message: "Please choose a different username",
        },
        { status: 400 }
      );
    }

    // Verify evaluation exists if provided
    const evaluationExists = await prisma.evaluation.findUnique({
      where: { evaluationId: teacherData.evaluationId },
    });

    if (!evaluationExists) {
      return Response.json({ error: "Evaluation not found" }, { status: 404 });
    }

    // Verify subjects exist before starting transaction
    if (subjects?.length) {
      const subjectIds = subjects.map((s) => s.subjectId);
      const existingSubjects = await prisma.subject.findMany({
        where: { subjectId: { in: subjectIds } },
        select: { subjectId: true },
      });

      if (existingSubjects.length !== subjectIds.length) {
        const existingIds = existingSubjects.map((s) => s.subjectId);
        const invalidIds = subjectIds.filter((id) => !existingIds.includes(id));
        return Response.json(
          {
            error: "Invalid subject IDs",
            message: `The following subject IDs do not exist: ${invalidIds.join(
              ", "
            )}`,
          },
          { status: 400 }
        );
      }

      // Verify subject-subject type combinations
      const subjectTypePairs = subjects.map((s) => ({
        subjectId: s.subjectId,
        subjectTypeId: s.subjectTypeId,
      }));

      // Check that each subject/subject type pair exists in SubjectToSubjectType
      const validPairs = await prisma.subjectToSubjectType.findMany({
        where: {
          OR: subjectTypePairs.map((pair) => ({
            subjectId: pair.subjectId,
            subjectTypeId: pair.subjectTypeId,
          })),
        },
        select: {
          subjectId: true,
          subjectTypeId: true,
        },
      });

      // If the count of valid pairs doesn't match the requested pairs, some pairs are invalid
      if (validPairs.length !== subjectTypePairs.length) {
        // Find the invalid pairs by checking which requested pairs aren't in the valid pairs
        const validPairStrings = validPairs.map(
          (p) => `${p.subjectId}-${p.subjectTypeId}`
        );
        const invalidPairs = subjectTypePairs.filter(
          (p) => !validPairStrings.includes(`${p.subjectId}-${p.subjectTypeId}`)
        );

        return Response.json(
          {
            error: "Invalid subject-subject type combinations",
            message: `The following subject-subject type combinations are not valid: ${invalidPairs
              .map((p) => `(${p.subjectId}, ${p.subjectTypeId})`)
              .join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    // Start a transaction to create everything
    const result = await prisma.$transaction(async (tx) => {
      // 1. Hash the password
      const passwordHash = await bcrypt.hash(password, 10);

      // 2. Create the user account
      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          name: teacherData.name,
          role: "TEACHER",
        },
      });

      // 3. Create the teacher record
      const teacher = await tx.teacher.create({
        data: {
          ...teacherData,
          userId: user.id,
        },
      });

      // 4. If subjects are provided, create teacher subject relationships
      if (subjects && subjects.length > 0) {
        await Promise.all(
          subjects.map((subject) =>
            tx.teacherSubject.create({
              data: {
                teacherId: teacher.teacherId,
                subjectId: subject.subjectId,
                subjectTypeId: subject.subjectTypeId,
              },
            })
          )
        );
      }

      // 5. If shifts are provided, create teacher shift references
      if (shifts && shifts.length > 0) {
        await Promise.all(
          shifts.map(
            (shift: {
              dayOfWeek: string;
              startTime: string;
              endTime: string;
              notes?: string;
            }) =>
              tx.teacherShiftReference.create({
                data: {
                  teacherId: teacher.teacherId,
                  dayOfWeek: shift.dayOfWeek as DayOfWeek,
                  startTime: new Date(`1970-01-01T${shift.startTime}`),
                  endTime: new Date(`1970-01-01T${shift.endTime}`),
                  notes: shift.notes,
                },
              })
          )
        );
      }

      // Return the created teacher with all related data
      return tx.teacher.findUnique({
        where: { teacherId: teacher.teacherId },
        include: {
          evaluation: true,
          teacherSubjects: {
            include: {
              subject: {
                include: {
                  subjectToSubjectTypes: {
                    include: {
                      subjectType: true,
                    },
                  },
                },
              },
              subjectType: true,
            },
          },
          TeacherShiftReference: true,
        },
      });
    });

    return Response.json(
      {
        message: "User and teacher created successfully",
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user and teacher:", error);
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Invalid request data", issues: error.issues },
        { status: 400 }
      );
    }
    return Response.json(
      {
        error: "Failed to create user and teacher",
        message: error instanceof Error ? error.message : "Unknown error",
      },
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
    const validatedData = UpdateTeacherWithSubjectsSchema.parse(body);
    const { teacherId, password, subjects, shifts, ...teacherData } =
      validatedData;

    // Check if teacher exists
    const existingTeacher = await prisma.teacher.findUnique({
      where: { teacherId },
      include: {
        teacherSubjects: true,
        TeacherShiftReference: true,
      },
    });

    if (!existingTeacher) {
      return Response.json({ error: "Teacher not found" }, { status: 404 });
    }

    // If evaluationId is provided, check if it exists
    if (teacherData.evaluationId) {
      const evaluationExists = await prisma.evaluation.findUnique({
        where: { evaluationId: teacherData.evaluationId },
      });

      if (!evaluationExists) {
        return Response.json(
          { error: "Evaluation not found" },
          { status: 404 }
        );
      }
    }

    // Verify subjects if provided
    if (subjects?.length) {
      const subjectIds = subjects.map((s) => s.subjectId);
      const existingSubjects = await prisma.subject.findMany({
        where: { subjectId: { in: subjectIds } },
        select: { subjectId: true },
      });

      if (existingSubjects.length !== subjectIds.length) {
        const existingIds = existingSubjects.map((s) => s.subjectId);
        const invalidIds = subjectIds.filter((id) => !existingIds.includes(id));
        return Response.json(
          {
            error: "Invalid subject IDs",
            message: `The following subject IDs do not exist: ${invalidIds.join(
              ", "
            )}`,
          },
          { status: 400 }
        );
      }

      // Verify subject-subject type combinations
      const subjectTypePairs = subjects.map((s) => ({
        subjectId: s.subjectId,
        subjectTypeId: s.subjectTypeId,
      }));

      // Check that each subject/subject type pair exists in SubjectToSubjectType
      const validPairs = await prisma.subjectToSubjectType.findMany({
        where: {
          OR: subjectTypePairs.map((pair) => ({
            subjectId: pair.subjectId,
            subjectTypeId: pair.subjectTypeId,
          })),
        },
        select: {
          subjectId: true,
          subjectTypeId: true,
        },
      });

      // If the count of valid pairs doesn't match the requested pairs, some pairs are invalid
      if (validPairs.length !== subjectTypePairs.length) {
        // Find the invalid pairs by checking which requested pairs aren't in the valid pairs
        const validPairStrings = validPairs.map(
          (p) => `${p.subjectId}-${p.subjectTypeId}`
        );
        const invalidPairs = subjectTypePairs.filter(
          (p) => !validPairStrings.includes(`${p.subjectId}-${p.subjectTypeId}`)
        );

        return Response.json(
          {
            error: "Invalid subject-subject type combinations",
            message: `The following subject-subject type combinations are not valid: ${invalidPairs
              .map((p) => `(${p.subjectId}, ${p.subjectTypeId})`)
              .join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    // Start transaction to update everything
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update teacher basic info
      const updateData = Object.fromEntries(
        Object.entries(teacherData).filter(([, value]) => value !== undefined)
      );

      // Update without storing the result since we don't use it
      await tx.teacher.update({
        where: { teacherId },
        data: updateData,
      });

      // 2. Update password if provided
      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        await tx.user.update({
          where: { id: existingTeacher.userId },
          data: { passwordHash },
        });
      }

      // 3. Update subjects if provided
      if (subjects !== undefined) {
        // Delete all existing subject relationships
        if (existingTeacher.teacherSubjects.length > 0) {
          await tx.teacherSubject.deleteMany({
            where: { teacherId },
          });
        }

        // Create new subject relationships
        if (subjects.length > 0) {
          await Promise.all(
            subjects.map((subject) =>
              tx.teacherSubject.create({
                data: {
                  teacherId,
                  subjectId: subject.subjectId,
                  subjectTypeId: subject.subjectTypeId,
                },
              })
            )
          );
        }
      }

      // 4. Update shifts if provided
      if (shifts !== undefined) {
        // Delete all existing shifts
        if (existingTeacher.TeacherShiftReference.length > 0) {
          await tx.teacherShiftReference.deleteMany({
            where: { teacherId },
          });
        }

        // Create new shifts
        if (shifts.length > 0) {
          await Promise.all(
            shifts.map((shift) =>
              tx.teacherShiftReference.create({
                data: {
                  teacherId,
                  dayOfWeek: shift.dayOfWeek,
                  startTime: new Date(`1970-01-01T${shift.startTime}`),
                  endTime: new Date(`1970-01-01T${shift.endTime}`),
                  notes: shift.notes,
                },
              })
            )
          );
        }
      }

      // Return the updated teacher with all related data
      return tx.teacher.findUnique({
        where: { teacherId },
        include: {
          evaluation: true,
          teacherSubjects: {
            include: {
              subject: {
                include: {
                  subjectToSubjectTypes: {
                    include: {
                      subjectType: true,
                    },
                  },
                },
              },
              subjectType: true,
            },
          },
          TeacherShiftReference: true,
        },
      });
    });

    return Response.json({
      message: "Teacher updated successfully",
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Failed to update teacher" },
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

    if (!teacherId) {
      return Response.json(
        { error: "Teacher ID is required" },
        { status: 400 }
      );
    }

    // Check if teacher exists
    const existingTeacher = await prisma.teacher.findUnique({
      where: { teacherId },
    });

    if (!existingTeacher) {
      return Response.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Check for related data before deletion
    const hasRelatedClassSessions = await prisma.classSession.findFirst({
      where: { teacherId },
    });

    const hasRelatedTemplates = await prisma.regularClassTemplate.findFirst({
      where: { teacherId },
    });

    const hasRelatedPreferences =
      await prisma.studentPreferenceTeacher.findFirst({
        where: { teacherId },
      });

    if (
      hasRelatedClassSessions ||
      hasRelatedTemplates ||
      hasRelatedPreferences
    ) {
      return Response.json(
        {
          error:
            "Teacher has related data and cannot be deleted (sessions, templates, or preferences exist)",
        },
        { status: 400 }
      );
    }

    // Delete the teacher subjects
    await prisma.teacherSubject.deleteMany({
      where: { teacherId },
    });

    // Delete the teacher shifts
    await prisma.teacherShiftReference.deleteMany({
      where: { teacherId },
    });

    // Delete the teacher and associated user
    await prisma.$transaction([
      prisma.teacher.delete({ where: { teacherId } }),
      prisma.user.delete({ where: { id: existingTeacher.userId } }),
    ]);

    return Response.json({
      message: "Teacher deleted successfully",
    });
  } catch {
    return Response.json(
      { error: "Failed to delete teacher" },
      { status: 500 }
    );
  }
}
