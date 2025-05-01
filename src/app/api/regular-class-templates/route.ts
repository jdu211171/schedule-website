import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  AvailabilityFilterSchema,
  CreateRegularClassTemplateSchema,
  BatchCreateRegularClassTemplateSchema,
  UpdateRegularClassTemplateSchema,
  TemplateQuerySchema,
} from "@/schemas/regular-class-template.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    // Special endpoint for finding available slots with filtering
    if (action === "available-slots") {
      const filterParams = Object.fromEntries(searchParams.entries());
      const filter = AvailabilityFilterSchema.parse(filterParams);

      // Parse time strings to Date objects for comparison
      const startTime = new Date(`1970-01-01T${filter.startTime}`);
      const endTime = new Date(`1970-01-01T${filter.endTime}`);

      // 1. Get compatible teachers based on filters
      let teacherQuery: Record<string, unknown> = {
        TeacherShiftReference: {
          some: {
            dayOfWeek: filter.dayOfWeek,
            startTime: { lte: startTime },
            endTime: { gte: endTime },
          },
        },
      };

      // Add subject filter if provided
      if (filter.subjectId) {
        teacherQuery.teacherSubjects = {
          some: { subjectId: filter.subjectId },
        };
      }

      // Add specific teacher filter if provided
      if (filter.teacherId) {
        teacherQuery.teacherId = filter.teacherId;
      }

      // 2. Get compatible students based on filters
      const studentQuery: Record<string, unknown> = {
        StudentPreference: {
          some: {
            timeSlots: {
              some: {
                dayOfWeek: filter.dayOfWeek,
                startTime: { lte: startTime },
                endTime: { gte: endTime },
              },
            },
            ...(filter.subjectId
              ? { subjects: { some: { subjectId: filter.subjectId } } }
              : {}),
          },
        },
        ...(filter.studentId && { studentId: filter.studentId }),
      };

      // 3. Get availability data with student preferences
      if (filter.studentId) {
        const student = await prisma.student.findUnique({
          where: { studentId: filter.studentId },
          include: {
            StudentPreference: {
              include: {
                teachers: { include: { teacher: true } },
                subjects: { include: { subject: true } },
              },
            },
          },
        });

        // Add preferred teacher filter if student has preferences
        if (
          student &&
          Array.isArray(student.StudentPreference) &&
          student.StudentPreference.length > 0
        ) {
          const preferredTeacherIds = student.StudentPreference[0].teachers.map(
            (t) => t.teacherId
          );
          if (preferredTeacherIds.length > 0 && !filter.teacherId) {
            teacherQuery = {
              ...teacherQuery,
              OR: [
                { teacherId: { in: preferredTeacherIds } },
                { ...teacherQuery },
              ],
            };
          }
        }
      }

      // 4. Get availability data with teacher preferences
      if (filter.teacherId) {
        const teacher = await prisma.teacher.findUnique({
          where: { teacherId: filter.teacherId },
          include: {
            teacherSubjects: { include: { subject: true } },
          },
        });

        // Use teacher's subjects to filter compatible students
        if (teacher && !filter.subjectId) {
          const teacherSubjectIds = teacher.teacherSubjects.map(
            (ts) => ts.subjectId
          );
          if (teacherSubjectIds.length > 0) {
            if (
              typeof studentQuery.StudentPreference === "object" &&
              studentQuery.StudentPreference !== null &&
              "some" in studentQuery.StudentPreference &&
              typeof (studentQuery.StudentPreference as Record<string, unknown>)
                .some === "object" &&
              (studentQuery.StudentPreference as Record<string, unknown>)
                .some !== null
            ) {
              const currentSome = (
                studentQuery.StudentPreference as Record<string, unknown>
              ).some;
              (studentQuery.StudentPreference as Record<string, unknown>).some =
                {
                  ...(typeof currentSome === "object" && currentSome !== null
                    ? currentSome
                    : {}),
                  subjects: { some: { subjectId: { in: teacherSubjectIds } } },
                };
            }
          }
        }
      }

      // 5. Find available booths at the specified time
      const boothQuery: Record<string, unknown> = {
        status: true,
        NOT: {
          regularClassTemplates: {
            some: {
              dayOfWeek: filter.dayOfWeek,
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            },
          },
        },
      };

      // Add specific booth filter if provided
      if (filter.boothId) {
        boothQuery.boothId = filter.boothId;
      }

      // Execute parallel queries for better performance
      const [
        compatibleTeachers,
        compatibleStudents,
        availableBooths,
        relevantSubjects,
      ] = await Promise.all([
        // Get compatible teachers
        prisma.teacher.findMany({
          where: teacherQuery,
          include: {
            teacherSubjects: { include: { subject: true } },
            TeacherShiftReference: true,
            evaluation: true,
          },
        }),

        // Get compatible students
        prisma.student.findMany({
          where: studentQuery,
          include: {
            grade: true,
            StudentPreference: {
              include: {
                subjects: { include: { subject: true } },
                teachers: { include: { teacher: true } },
                timeSlots: true,
              },
            },
          },
        }),

        // Get available booths
        prisma.booth.findMany({
          where: boothQuery,
        }),

        // Get relevant subjects
        prisma.subject.findMany({
          where: filter.subjectId ? { subjectId: filter.subjectId } : {}, // Get all if not specified
          include: { subjectType: true },
        }),
      ]);

      return Response.json({
        data: {
          teachers: compatibleTeachers,
          students: compatibleStudents,
          booths: availableBooths,
          subjects: relevantSubjects,
          timeSlot: {
            dayOfWeek: filter.dayOfWeek,
            startTime: filter.startTime,
            endTime: filter.endTime,
          },
        },
      });
    } else {
      // Regular template listing with pagination and filtering
      const query = TemplateQuerySchema.parse(
        Object.fromEntries(searchParams.entries())
      );

      const {
        page,
        limit,
        dayOfWeek,
        teacherId,
        studentId,
        subjectId,
        boothId,
        sort,
        order,
      } = query;

      const filters: Record<string, unknown> = {};

      if (dayOfWeek) {
        filters.dayOfWeek = dayOfWeek;
      }

      if (teacherId) {
        filters.teacherId = teacherId;
      }

      if (subjectId) {
        filters.subjectId = subjectId;
      }

      if (boothId) {
        filters.boothId = boothId;
      }

      if (studentId) {
        filters.templateStudentAssignments = {
          some: { studentId },
        };
      }

      const skip = (page - 1) * limit;

      const orderBy: Record<string, string> = {};
      orderBy[sort] = order;

      const total = await prisma.regularClassTemplate.count({ where: filters });

      const templates = await prisma.regularClassTemplate.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy,
        include: {
          teacher: true,
          subject: true,
          booth: true,
          templateStudentAssignments: {
            include: {
              student: true,
            },
          },
        },
      });

      return Response.json({
        data: templates,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Invalid parameters", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error fetching data:", error);
    return Response.json({ error: "Failed to fetch data" }, { status: 500 });
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
    const isBatch = Array.isArray(body);

    // Parse templates (single or batch)
    let templates = [];
    if (isBatch) {
      templates = BatchCreateRegularClassTemplateSchema.parse(body);
    } else {
      templates = [CreateRegularClassTemplateSchema.parse(body)];
    }

    // Prepare time objects for conflict detection
    const templatesWithTimeObjects = templates.map((template) => {
      const startTime = new Date(`1970-01-01T${template.startTime}`);
      const endTime = new Date(`1970-01-01T${template.endTime}`);
      return {
        ...template,
        startTimeObj: startTime,
        endTimeObj: endTime,
      };
    });

    // Check for booth conflicts across all templates
    const boothConflicts = await Promise.all(
      templatesWithTimeObjects.map(async (template) => {
        const existingTemplates = await prisma.regularClassTemplate.findMany({
          where: {
            boothId: template.boothId,
            dayOfWeek: template.dayOfWeek,
            startTime: { lt: template.endTimeObj },
            endTime: { gt: template.startTimeObj },
          },
        });

        return {
          template,
          conflicts: existingTemplates.length > 0 ? existingTemplates : null,
        };
      })
    );

    // Check for teacher conflicts across all templates
    const teacherConflicts = await Promise.all(
      templatesWithTimeObjects.map(async (template) => {
        const existingTemplates = await prisma.regularClassTemplate.findMany({
          where: {
            teacherId: template.teacherId,
            dayOfWeek: template.dayOfWeek,
            startTime: { lt: template.endTimeObj },
            endTime: { gt: template.startTimeObj },
          },
        });

        return {
          template,
          conflicts: existingTemplates.length > 0 ? existingTemplates : null,
        };
      })
    );

    // Check for student conflicts across all templates
    const studentConflicts = await Promise.all(
      templatesWithTimeObjects.flatMap((template) =>
        template.studentIds.map(async (studentId) => {
          const existingTemplates = await prisma.regularClassTemplate.findMany({
            where: {
              dayOfWeek: template.dayOfWeek,
              startTime: { lt: template.endTimeObj },
              endTime: { gt: template.startTimeObj },
              templateStudentAssignments: {
                some: { studentId },
              },
            },
          });

          return {
            template,
            studentId,
            conflicts: existingTemplates.length > 0 ? existingTemplates : null,
          };
        })
      )
    );

    // Collect all conflicts
    const allConflicts = {
      booth: boothConflicts.filter((c) => c.conflicts !== null),
      teacher: teacherConflicts.filter((c) => c.conflicts !== null),
      student: studentConflicts.filter((c) => c.conflicts !== null),
    };

    // If any conflicts found, return error with details
    if (
      allConflicts.booth.length > 0 ||
      allConflicts.teacher.length > 0 ||
      allConflicts.student.length > 0
    ) {
      return Response.json(
        {
          error: "Scheduling conflict detected",
          conflicts: allConflicts,
        },
        { status: 409 }
      );
    }

    // If no conflicts, proceed with creation in a transaction
    const results = await prisma.$transaction(
      templates.map((template) => {
        const {
          studentIds,
          startTime,
          endTime,
          startDate,
          endDate,
          ...templateData
        } = template;

        // Convert time strings to Date objects
        return prisma.regularClassTemplate.create({
          data: {
            ...templateData,
            startTime: new Date(`1970-01-01T${startTime}`),
            endTime: new Date(`1970-01-01T${endTime}`),
            ...(startDate ? { startDate: new Date(startDate) } : {}),
            ...(endDate ? { endDate: new Date(endDate) } : {}),
            templateStudentAssignments: {
              create: studentIds.map((studentId) => ({
                studentId,
              })),
            },
          },
          include: {
            teacher: true,
            subject: true,
            booth: true,
            templateStudentAssignments: {
              include: {
                student: true,
              },
            },
          },
        });
      }),
      {
        // Set transaction isolation level to prevent race conditions
        isolationLevel: "Serializable",
      }
    );

    return Response.json(
      {
        message: `${results.length} template${
          results.length === 1 ? "" : "s"
        } created successfully`,
        data: results,
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
    console.error("Error creating template:", error);
    return Response.json(
      {
        error: "Failed to create template",
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
    const {
      templateId,
      studentIds,
      startTime,
      endTime,
      startDate,
      endDate,
      ...data
    } = UpdateRegularClassTemplateSchema.parse(body);

    // Check if template exists
    const existingTemplate = await prisma.regularClassTemplate.findUnique({
      where: { templateId },
      include: {
        templateStudentAssignments: true,
      },
    });

    if (!existingTemplate) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

    // Prepare update data with time conversions
    const updateData: Record<string, unknown> = { ...data };

    if (startTime) {
      updateData.startTime = new Date(`1970-01-01T${startTime}`);
    }

    if (endTime) {
      updateData.endTime = new Date(`1970-01-01T${endTime}`);
    }

    if (startDate) {
      updateData.startDate = new Date(startDate);
    }

    if (endDate) {
      updateData.endDate = new Date(endDate);
    }

    // Check for conflicts if time, day, booth, or teacher is changing
    if (
      startTime ||
      endTime ||
      data.dayOfWeek ||
      data.boothId ||
      data.teacherId
    ) {
      const startTimeObj = startTime
        ? new Date(`1970-01-01T${startTime}`)
        : existingTemplate.startTime;

      const endTimeObj = endTime
        ? new Date(`1970-01-01T${endTime}`)
        : existingTemplate.endTime;

      const dayOfWeek = data.dayOfWeek || existingTemplate.dayOfWeek;
      const boothId = data.boothId || existingTemplate.boothId;
      const teacherId = data.teacherId || existingTemplate.teacherId;

      // Check booth conflicts
      const boothConflicts = await prisma.regularClassTemplate.findMany({
        where: {
          boothId,
          dayOfWeek,
          startTime: { lt: endTimeObj },
          endTime: { gt: startTimeObj },
          NOT: { templateId },
        },
      });

      // Check teacher conflicts
      const teacherConflicts = await prisma.regularClassTemplate.findMany({
        where: {
          teacherId,
          dayOfWeek,
          startTime: { lt: endTimeObj },
          endTime: { gt: startTimeObj },
          NOT: { templateId },
        },
      });

      // Check student conflicts if student IDs are provided
      const studentConflicts = [];
      if (studentIds && studentIds.length > 0) {
        for (const studentId of studentIds) {
          const conflicts = await prisma.regularClassTemplate.findMany({
            where: {
              dayOfWeek,
              startTime: { lt: endTimeObj },
              endTime: { gt: startTimeObj },
              templateStudentAssignments: {
                some: { studentId },
              },
              NOT: { templateId },
            },
          });

          if (conflicts.length > 0) {
            studentConflicts.push({ studentId, conflicts });
          }
        }
      }

      // Combine all conflicts
      const allConflicts = {
        booth: boothConflicts,
        teacher: teacherConflicts,
        student: studentConflicts,
      };

      // Return error if conflicts found
      if (
        boothConflicts.length > 0 ||
        teacherConflicts.length > 0 ||
        studentConflicts.length > 0
      ) {
        return Response.json(
          {
            error: "Update would create scheduling conflicts",
            conflicts: allConflicts,
          },
          { status: 409 }
        );
      }
    }

    // Update template and student assignments in a transaction
    const result = await prisma.$transaction(
      async (tx) => {
        // Update the template itself
        await tx.regularClassTemplate.update({
          where: { templateId },
          data: updateData,
        });

        // Update student assignments if provided
        if (studentIds) {
          // Delete existing assignments
          await tx.templateStudentAssignment.deleteMany({
            where: { templateId },
          });

          // Create new assignments
          await Promise.all(
            studentIds.map((studentId) =>
              tx.templateStudentAssignment.create({
                data: {
                  templateId,
                  studentId,
                },
              })
            )
          );
        }

        // Return updated template with related data
        return tx.regularClassTemplate.findUnique({
          where: { templateId },
          include: {
            teacher: true,
            subject: true,
            booth: true,
            templateStudentAssignments: {
              include: {
                student: true,
              },
            },
          },
        });
      },
      {
        // Set transaction isolation level to prevent race conditions
        isolationLevel: "Serializable",
      }
    );

    return Response.json({
      message: "Template updated successfully",
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating template:", error);
    return Response.json(
      { error: "Failed to update template" },
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
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return Response.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Check if template exists
    const existingTemplate = await prisma.regularClassTemplate.findUnique({
      where: { templateId },
    });

    if (!existingTemplate) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

    // Check for related class sessions before deletion
    const hasRelatedClassSessions = await prisma.classSession.findFirst({
      where: { templateId },
    });

    if (hasRelatedClassSessions) {
      return Response.json(
        {
          error: "Cannot delete template with related class sessions",
        },
        { status: 409 }
      );
    }

    // Delete the template (cascade will handle student assignments)
    await prisma.regularClassTemplate.delete({
      where: { templateId },
    });

    return Response.json({
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    return Response.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
