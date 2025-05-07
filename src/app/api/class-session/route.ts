import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  CreateClassSessionSchema,
  CreateClassSessionFromTemplateSchema,
  UpdateStandaloneClassSessionSchema,
  UpdateTemplateClassSessionSchema,
  ClassSessionQuerySchema,
} from "@/schemas/class-session.schema";
import { ZodError } from "zod";
import { DayOfWeek } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = ClassSessionQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const {
      page,
      limit,
      date,
      startDate,
      endDate,
      teacherId,
      studentId,
      subjectId,
      subjectTypeId,
      boothId,
      classTypeId,
      templateId,
      dayOfWeek,
      isTemplateInstance,
      sort,
      order,
    } = query;

    const filters: Record<string, unknown> = {};

    // Handle subjectTypeId filtering (single or multiple)
    if (subjectTypeId) {
      if (Array.isArray(subjectTypeId)) {
        filters.subject = {
          subjectTypeId: { in: subjectTypeId },
        };
      } else {
        filters.subject = {
          subjectTypeId: subjectTypeId,
        };
      }
    }

    // Handle single date filter
    if (date) {
      const dateParts = date.split('-');
      if (dateParts.length === 3) {
        // Create a Date object for the start of the day
        const startOfDay = new Date(
          parseInt(dateParts[0]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[2]),
          0,
          0,
          0
        );
        // Create a Date object for the end of the day
        const endOfDay = new Date(
          parseInt(dateParts[0]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[2]),
          23,
          59,
          59
        );
        filters.date = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }
    }

    // Handle date range filter
    if (startDate && endDate) {
      const startDateParts = startDate.split('-');
      const endDateParts = endDate.split('-');
      if (startDateParts.length === 3 && endDateParts.length === 3) {
        // Create Date objects for the start and end dates
        const start = new Date(
          parseInt(startDateParts[0]),
          parseInt(startDateParts[1]) - 1,
          parseInt(startDateParts[2]),
          0,
          0,
          0
        );
        const end = new Date(
          parseInt(endDateParts[0]),
          parseInt(endDateParts[1]) - 1,
          parseInt(endDateParts[2]),
          23,
          59,
          59
        );
        filters.date = {
          gte: start,
          lte: end,
        };
      }
    } else if (startDate) {
      const startDateParts = startDate.split('-');
      if (startDateParts.length === 3) {
        filters.date = {
          gte: new Date(
            parseInt(startDateParts[0]),
            parseInt(startDateParts[1]) - 1,
            parseInt(startDateParts[2]),
            0,
            0,
            0
          ),
        };
      }
    } else if (endDate) {
      const endDateParts = endDate.split('-');
      if (endDateParts.length === 3) {
        filters.date = {
          lte: new Date(
            parseInt(endDateParts[0]),
            parseInt(endDateParts[1]) - 1,
            parseInt(endDateParts[2]),
            23,
            59,
            59
          ),
        };
      }
    }

    // Handle teacherId filtering (single or multiple)
    if (teacherId) {
      if (Array.isArray(teacherId)) {
        filters.teacherId = { in: teacherId };
      } else {
        filters.teacherId = teacherId;
      }
    }

    // Handle studentId filtering (single or multiple)
    if (studentId) {
      if (Array.isArray(studentId)) {
        filters.studentId = { in: studentId };
      } else {
        filters.studentId = studentId;
      }
    }

    // Handle subjectId filtering (single or multiple)
    if (subjectId) {
      if (Array.isArray(subjectId)) {
        filters.subjectId = { in: subjectId };
      } else {
        filters.subjectId = subjectId;
      }
    }

    // Handle boothId filtering (single or multiple)
    if (boothId) {
      if (Array.isArray(boothId)) {
        filters.boothId = { in: boothId };
      } else {
        filters.boothId = boothId;
      }
    }

    // Handle classTypeId filtering (single or multiple)
    if (classTypeId) {
      if (Array.isArray(classTypeId)) {
        filters.classTypeId = { in: classTypeId };
      } else {
        filters.classTypeId = classTypeId;
      }
    }

    // Handle templateId filtering (single or multiple)
    if (templateId) {
      if (Array.isArray(templateId)) {
        filters.templateId = { in: templateId };
      } else {
        filters.templateId = templateId;
      }
    }

    // Handle dayOfWeek filtering for templates (single or multiple)
    if (dayOfWeek && !date && !startDate && !endDate) {
      if (Array.isArray(dayOfWeek)) {
        filters.regularClassTemplate = {
          dayOfWeek: { in: dayOfWeek as DayOfWeek[] }
        };
      } else {
        filters.regularClassTemplate = {
          dayOfWeek: dayOfWeek as DayOfWeek
        };
      }
    }

    // Handle isTemplateInstance filter
    if (isTemplateInstance === 'true') {
      filters.templateId = { not: null };
    } else if (isTemplateInstance === 'false') {
      filters.templateId = null;
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[sort] = order;

    const total = await prisma.classSession.count({
      where: filters,
    });

    const classSessions = await prisma.classSession.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy,
      include: {
        booth: true,
        classType: true,
        subject: true,
        subjectType: true,
        teacher: true,
        student: true,
        regularClassTemplate: true,
        studentClassEnrollments: {
          include: {
            student: true,
          },
        },
      },
    });

    return Response.json({
      data: classSessions,
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
        { error: "無効なクエリパラメータ", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "授業セッションの取得に失敗しました" },
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

    // Check if this is a template-based class session or a standalone class session
    const isTemplateBasedClass = body.templateId !== undefined;

    if (isTemplateBasedClass) {
      // Validate template-based class session data
      const validatedData = CreateClassSessionFromTemplateSchema.parse(body);
      const { templateId, date, startTime, endTime, boothId, notes } =
        validatedData;

      // Fetch template data
      const template = await prisma.regularClassTemplate.findUnique({
        where: { templateId },
      });

      if (!template) {
        return Response.json({ error: "Template not found" }, { status: 404 });
      }

      // Get students assigned to the template
      const studentAssignments =
        await prisma.templateStudentAssignment.findMany({
          where: { templateId },
        });

      if (studentAssignments.length === 0) {
        return Response.json(
          { error: "No students assigned to this template" },
          { status: 400 }
        );
      }

      // Check for conflicts and validate the resources
      // Use the provided overrides or default to template values
      const classStartTime = startTime
        ? new Date(`1970-01-01T${startTime}`)
        : template.startTime;
      const classEndTime = endTime
        ? new Date(`1970-01-01T${endTime}`)
        : template.endTime;
      const classBoothId = boothId || template.boothId;

      // Check if booth exists
      const boothExists = await prisma.booth.findUnique({
        where: { boothId: classBoothId },
      });

      if (!boothExists) {
        return Response.json({ error: "Booth not found" }, { status: 404 });
      }

      // Check for booth conflicts on the given date
      const boothConflicts = await prisma.classSession.findMany({
        where: {
          date: date,
          boothId: classBoothId,
          AND: [
            {
              OR: [
                {
                  startTime: {
                    lt: classEndTime,
                  },
                  endTime: {
                    gt: classStartTime,
                  },
                },
                {
                  startTime: {
                    equals: classStartTime,
                  },
                },
                {
                  endTime: {
                    equals: classEndTime,
                  },
                },
              ],
            },
          ],
        },
      });

      if (boothConflicts.length > 0) {
        return Response.json(
          {
            error: "Booth is already booked for this time",
            conflicts: boothConflicts,
          },
          { status: 409 }
        );
      }

      // Check for teacher conflicts on the given date
      const teacherConflicts = await prisma.classSession.findMany({
        where: {
          date: date,
          teacherId: template.teacherId,
          AND: [
            {
              OR: [
                {
                  startTime: {
                    lt: classEndTime,
                  },
                  endTime: {
                    gt: classStartTime,
                  },
                },
                {
                  startTime: {
                    equals: classStartTime,
                  },
                },
                {
                  endTime: {
                    equals: classEndTime,
                  },
                },
              ],
            },
          ],
        },
      });

      if (teacherConflicts.length > 0) {
        return Response.json(
          {
            error: "Teacher is already booked for this time",
            conflicts: teacherConflicts,
          },
          { status: 409 }
        );
      }

      // All validations passed, create the class session
      const result = await prisma.$transaction(async (tx) => {
        // Create the class session for each student assigned to the template
        const classSessions = [];

        for (const assignment of studentAssignments) {
          // Check for student conflicts on the given date
          const studentConflicts = await tx.classSession.findMany({
            where: {
              date: date,
              studentId: assignment.studentId,
              AND: [
                {
                  OR: [
                    {
                      startTime: {
                        lt: classEndTime,
                      },
                      endTime: {
                        gt: classStartTime,
                      },
                    },
                    {
                      startTime: {
                        equals: classStartTime,
                      },
                    },
                    {
                      endTime: {
                        equals: classEndTime,
                      },
                    },
                  ],
                },
              ],
            },
          });

          if (studentConflicts.length > 0) {
            // Skip this student but continue processing others
            console.warn(
              `Student ${assignment.studentId} has a conflict and will be skipped`
            );
            continue;
          }

          // Calculate duration
          const start = new Date(
            `1970-01-01T${
              startTime || template.startTime.toISOString().substring(11, 19)
            }`
          );
          const end = new Date(
            `1970-01-01T${
              endTime || template.endTime.toISOString().substring(11, 19)
            }`
          );
          const durationMs = end.getTime() - start.getTime();
          const durationDate = new Date(durationMs);

          // Create the class session
          const classSession = await tx.classSession.create({
            data: {
              date: date,
              startTime: start,
              endTime: end,
              duration: durationDate,
              teacherId: template.teacherId,
              studentId: assignment.studentId,
              subjectId: template.subjectId,
              subjectTypeId: template.subjectTypeId, // <-- add this line
              boothId: classBoothId,
              classTypeId: template.classTypeId, // <-- use the template's classTypeId
              templateId: templateId,
              notes: notes,
            },
            include: {
              booth: true,
              classType: true,
              subject: true,
              teacher: true,
              student: true,
              regularClassTemplate: true,
            },
          });

          // Create enrollment for this student
          await tx.studentClassEnrollment.create({
            data: {
              classId: classSession.classId,
              studentId: assignment.studentId,
              status: "ENROLLED",
            },
          });

          classSessions.push(classSession);
        }

        return classSessions;
      });

      return Response.json(
        {
          message: "Class sessions created successfully from template",
          data: result,
        },
        { status: 201 }
      );
    } else {
      // Handle standalone class session creation
      const validatedData = CreateClassSessionSchema.parse(body);
      const {
        date,
        startTime,
        endTime,
        teacherId,
        studentId,
        subjectId,
        subjectTypeId,
        boothId,
        classTypeId,
        notes,
      } = validatedData;

      // Validate all entities exist
      const [
        teacherExists,
        studentExists,
        subjectExists,
        subjectTypeExists,
        boothExists,
        classTypeExists,
      ] = await Promise.all([
        prisma.teacher.findUnique({ where: { teacherId } }),
        prisma.student.findUnique({ where: { studentId } }),
        prisma.subject.findUnique({ where: { subjectId } }),
        prisma.subjectType.findUnique({ where: { subjectTypeId } }),
        prisma.booth.findUnique({ where: { boothId } }),
        prisma.classType.findUnique({ where: { classTypeId } }),
      ]);

      if (!teacherExists) {
        return Response.json({ error: "先生が見つかりません" }, { status: 404 });
      }
      if (!studentExists) {
        return Response.json({ error: "生徒が見つかりません" }, { status: 404 });
      }
      if (!subjectExists) {
        return Response.json(
          { error: "科目が見つかりません" },
          { status: 404 }
        );
      }
      if (!subjectTypeExists) {
        return Response.json(
          { error: "科目タイプが見つかりません" },
          { status: 404 }
        );
      }
      if (!boothExists) {
        return Response.json({ error: "ブーズが見つかりません" }, { status: 404 });
      }
      if (!classTypeExists) {
        return Response.json(
          { error: "授業タイプが見つかりません" },
          { status: 404 }
        );
      }

      // Convert times to Date objects
      const start = new Date(`1970-01-01T${startTime}`);
      const end = new Date(`1970-01-01T${endTime}`);

      // Validate time range
      if (end <= start) {
        return Response.json(
          { error: "End time must be after start time" },
          { status: 400 }
        );
      }

      // Calculate duration
      const durationMs = end.getTime() - start.getTime();
      const durationDate = new Date(durationMs);

      // Check for conflicts
      const [boothConflicts, teacherConflicts, studentConflicts] =
        await Promise.all([
          // Booth conflicts
          prisma.classSession.findMany({
            where: {
              date: date,
              boothId,
              AND: [
                {
                  OR: [
                    {
                      startTime: {
                        lt: end,
                      },
                      endTime: {
                        gt: start,
                      },
                    },
                    {
                      startTime: {
                        equals: start,
                      },
                    },
                    {
                      endTime: {
                        equals: end,
                      },
                    },
                  ],
                },
              ],
            },
          }),
          // Teacher conflicts
          prisma.classSession.findMany({
            where: {
              date: date,
              teacherId,
              AND: [
                {
                  OR: [
                    {
                      startTime: {
                        lt: end,
                      },
                      endTime: {
                        gt: start,
                      },
                    },
                    {
                      startTime: {
                        equals: start,
                      },
                    },
                    {
                      endTime: {
                        equals: end,
                      },
                    },
                  ],
                },
              ],
            },
          }),
          // Student conflicts
          prisma.classSession.findMany({
            where: {
              date: date,
              studentId,
              AND: [
                {
                  OR: [
                    {
                      startTime: {
                        lt: end,
                      },
                      endTime: {
                        gt: start,
                      },
                    },
                    {
                      startTime: {
                        equals: start,
                      },
                    },
                    {
                      endTime: {
                        equals: end,
                      },
                    },
                  ],
                },
              ],
            },
          }),
        ]);

      if (boothConflicts.length > 0) {
        return Response.json(
          {
            error: "Booth is already booked for this time",
            conflicts: boothConflicts,
          },
          { status: 409 }
        );
      }

      if (teacherConflicts.length > 0) {
        return Response.json(
          {
            error: "Teacher is already booked for this time",
            conflicts: teacherConflicts,
          },
          { status: 409 }
        );
      }

      if (studentConflicts.length > 0) {
        return Response.json(
          {
            error: "Student is already booked for this time",
            conflicts: studentConflicts,
          },
          { status: 409 }
        );
      }

      // Create the class session and enrollment in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create the class session
        const classSession = await tx.classSession.create({
          data: {
            date,
            startTime: start,
            endTime: end,
            duration: durationDate,
            teacherId,
            studentId,
            subjectId,
            subjectTypeId,
            boothId,
            classTypeId,
            notes,
          },
          include: {
            booth: true,
            classType: true,
            subject: true,
            subjectType: true,
            teacher: true,
            student: true,
          },
        });

        // Create enrollment for this student
        await tx.studentClassEnrollment.create({
          data: {
            classId: classSession.classId,
            studentId,
            status: "ENROLLED",
          },
        });

        return classSession;
      });

      return Response.json(
        {
          message: "Class session created successfully",
          data: result,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error creating class session:", error);
    if (error instanceof ZodError) {
      return Response.json(
        { error: "無効なリクエストデータ", issues: error.issues },
        { status: 400 }
      );
    }
    return Response.json(
      {
        error: "授業セッションの作成に失敗しました",
        message: error instanceof Error ? error.message : "不明なエラー",
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
    const { classId } = body;

    if (!classId) {
      return Response.json(
        { error: "Class session ID is required" },
        { status: 400 }
      );
    }

    // Check if class session exists
    const existingClassSession = await prisma.classSession.findUnique({
      where: { classId },
    });

    if (!existingClassSession) {
      return Response.json(
        { error: "Class session not found" },
        { status: 404 }
      );
    }

    // Determine whether this is a template-based class session
    const isTemplateBasedClass = existingClassSession.templateId !== null;

    if (isTemplateBasedClass) {
      // For template-based class sessions, only allow modifying specific fields
      const validatedData = UpdateTemplateClassSessionSchema.parse(body);
      const { startTime, endTime, boothId, subjectTypeId, notes } = validatedData;

      // Prepare data for update
      const updateData: Record<string, unknown> = {};

      if (subjectTypeId !== undefined) {
        const subjectTypeExists = await prisma.subjectType.findUnique({
          where: { subjectTypeId },
        });
        if (!subjectTypeExists) {
          return Response.json(
            { error: "Subject type not found" },
            { status: 404 }
          );
        }
        updateData.subjectTypeId = subjectTypeId;
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      if (boothId !== undefined) {
        // Check if booth exists
        const boothExists = await prisma.booth.findUnique({
          where: { boothId },
        });

        if (!boothExists) {
          return Response.json({ error: "Booth not found" }, { status: 404 });
        }

        updateData.boothId = boothId;
      }

      // Handle time updates
      if (startTime !== undefined || endTime !== undefined) {
        const originalStart = existingClassSession.startTime;
        const originalEnd = existingClassSession.endTime;

        // Convert strings to Date objects
        const newStart = startTime
          ? new Date(`1970-01-01T${startTime}`)
          : originalStart;
        const newEnd = endTime
          ? new Date(`1970-01-01T${endTime}`)
          : originalEnd;

        // Validate time range
        if (newEnd <= newStart) {
          return Response.json(
            { error: "End time must be after start time" },
            { status: 400 }
          );
        }

        // Calculate duration
        const durationMs = newEnd.getTime() - newStart.getTime();
        const durationDate = new Date(durationMs);

        updateData.startTime = newStart;
        updateData.endTime = newEnd;
        updateData.duration = durationDate;

        // Check for conflicts with the new times and booth
        const boothToCheck = boothId || existingClassSession.boothId;

        const conflicts = await prisma.classSession.findMany({
          where: {
            date: existingClassSession.date,
            boothId: boothToCheck,
            classId: { not: classId }, // Exclude current session
            AND: [
              {
                OR: [
                  {
                    startTime: {
                      lt: newEnd,
                    },
                    endTime: {
                      gt: newStart,
                    },
                  },
                  {
                    startTime: {
                      equals: newStart,
                    },
                  },
                  {
                    endTime: {
                      equals: newEnd,
                    },
                  },
                ],
              },
            ],
          },
        });

        if (conflicts.length > 0) {
          return Response.json(
            {
              error:
                "There is a scheduling conflict with the new time or booth",
              conflicts,
            },
            { status: 409 }
          );
        }
      }

      // Update the class session
      const updatedClassSession = await prisma.classSession.update({
        where: { classId },
        data: updateData,
        include: {
          booth: true,
          classType: true,
          subject: true,
          teacher: true,
          student: true,
          regularClassTemplate: true,
        },
      });

      return Response.json({
        message: "Template-based class session updated successfully",
        data: updatedClassSession,
      });
    } else {
      // For standalone class sessions, allow modifying all fields
      const validatedData = UpdateStandaloneClassSessionSchema.parse(body);
      const {
        date,
        startTime,
        endTime,
        teacherId,
        studentId,
        subjectId,
        subjectTypeId,
        boothId,
        classTypeId,
        notes,
      } = validatedData;

      // Prepare update data
      const updateData: Record<string, unknown> = {};

      // Add fields that are present in the request
      if (notes !== undefined) updateData.notes = notes;
      if (date !== undefined && date !== null) updateData.date = date;
      if (teacherId !== undefined) {
        const teacherExists = await prisma.teacher.findUnique({
          where: { teacherId },
        });
        if (!teacherExists) {
          return Response.json({ error: "Teacher not found" }, { status: 404 });
        }
        updateData.teacherId = teacherId;
      }
      if (studentId !== undefined) {
        const studentExists = await prisma.student.findUnique({
          where: { studentId },
        });
        if (!studentExists) {
          return Response.json({ error: "Student not found" }, { status: 404 });
        }
        updateData.studentId = studentId;
      }
      if (subjectId !== undefined) {
        const subjectExists = await prisma.subject.findUnique({
          where: { subjectId },
        });
        if (!subjectExists) {
          return Response.json({ error: "Subject not found" }, { status: 404 });
        }
        updateData.subjectId = subjectId;
      }
      if (subjectTypeId !== undefined) {
        const subjectTypeExists = await prisma.subjectType.findUnique({
          where: { subjectTypeId },
        });
        if (!subjectTypeExists) {
          return Response.json({ error: "Subject type not found" }, { status: 404 });
        }
        updateData.subjectTypeId = subjectTypeId;
      }
      if (boothId !== undefined) {
        const boothExists = await prisma.booth.findUnique({
          where: { boothId },
        });
        if (!boothExists) {
          return Response.json({ error: "Booth not found" }, { status: 404 });
        }
        updateData.boothId = boothId;
      }
      if (classTypeId !== undefined) {
        const classTypeExists = await prisma.classType.findUnique({
          where: { classTypeId },
        });
        if (!classTypeExists) {
          return Response.json(
            { error: "Class type not found" },
            { status: 404 }
          );
        }
        updateData.classTypeId = classTypeId;
      }

      // Handle time updates
      if (startTime !== undefined || endTime !== undefined) {
        const originalStart = existingClassSession.startTime;
        const originalEnd = existingClassSession.endTime;

        // Convert strings to Date objects
        const newStart = startTime
          ? new Date(`1970-01-01T${startTime}`)
          : originalStart;
        const newEnd = endTime
          ? new Date(`1970-01-01T${endTime}`)
          : originalEnd;

        // Validate time range
        if (newEnd <= newStart) {
          return Response.json(
            { error: "End time must be after start time" },
            { status: 400 }
          );
        }

        // Calculate duration
        const durationMs = newEnd.getTime() - newStart.getTime();
        const durationDate = new Date(durationMs);

        if (startTime !== undefined) updateData.startTime = newStart;
        if (endTime !== undefined) updateData.endTime = newEnd;
        updateData.duration = durationDate;
      }

      // Check for conflicts
      if (Object.keys(updateData).length > 0) {
        const dateToCheck = date || existingClassSession.date;
        const startToCheck =
          (updateData.startTime && updateData.startTime instanceof Date)
            ? updateData.startTime as Date
            : existingClassSession.startTime;
        const endToCheck =
          (updateData.endTime && updateData.endTime instanceof Date)
            ? updateData.endTime as Date
            : existingClassSession.endTime;
        const boothToCheck = boothId || existingClassSession.boothId;
        const teacherToCheck = teacherId || existingClassSession.teacherId;
        const studentToCheck = studentId || existingClassSession.studentId;

        // Check for conflicts with booth
        if (date || startTime || endTime || boothId) {
          const boothConflicts = await prisma.classSession.findMany({
            where: {
              date: dateToCheck,
              boothId: boothToCheck,
              classId: { not: classId }, // Exclude current session
              AND: [
                {
                  OR: [
                    {
                      startTime: {
                        lt: endToCheck,
                      },
                      endTime: {
                        gt: startToCheck,
                      },
                    },
                    {
                      startTime: {
                        equals: startToCheck,
                      },
                    },
                    {
                      endTime: {
                        equals: endToCheck,
                      },
                    },
                  ],
                },
              ],
            },
          });

          if (boothConflicts.length > 0) {
            return Response.json(
              {
                error: "Booth is already booked for this time",
                conflicts: boothConflicts,
              },
              { status: 409 }
            );
          }
        }

        // Check for conflicts with teacher
        if (date || startTime || endTime || teacherId) {
          const teacherConflicts = await prisma.classSession.findMany({
            where: {
              date: dateToCheck,
              teacherId: teacherToCheck,
              classId: { not: classId }, // Exclude current session
              AND: [
                {
                  OR: [
                    {
                      startTime: {
                        lt: endToCheck,
                      },
                      endTime: {
                        gt: startToCheck,
                      },
                    },
                    {
                      startTime: {
                        equals: startToCheck,
                      },
                    },
                    {
                      endTime: {
                        equals: endToCheck,
                      },
                    },
                  ],
                },
              ],
            },
          });

          if (teacherConflicts.length > 0) {
            return Response.json(
              {
                error: "Teacher is already booked for this time",
                conflicts: teacherConflicts,
              },
              { status: 409 }
            );
          }
        }

        // Check for conflicts with student
        if (date || startTime || endTime || studentId) {
          const studentConflicts = await prisma.classSession.findMany({
            where: {
              date: dateToCheck,
              studentId: studentToCheck,
              classId: { not: classId }, // Exclude current session
              AND: [
                {
                  OR: [
                    {
                      startTime: {
                        lt: endToCheck,
                      },
                      endTime: {
                        gt: startToCheck,
                      },
                    },
                    {
                      startTime: {
                        equals: startToCheck,
                      },
                    },
                    {
                      endTime: {
                        equals: endToCheck,
                      },
                    },
                  ],
                },
              ],
            },
          });

          if (studentConflicts.length > 0) {
            return Response.json(
              {
                error: "Student is already booked for this time",
                conflicts: studentConflicts,
              },
              { status: 409 }
            );
          }
        }
      }

      // Update the class session
      const result = await prisma.$transaction(async (tx) => {
        // Update the class session
        const updatedClassSession = await tx.classSession.update({
          where: { classId },
          data: updateData,
          include: {
            booth: true,
            classType: true,
            subject: true,
            subjectType: true,
            teacher: true,
            student: true,
          },
        });

        // If student changed, update enrollment
        if (studentId && studentId !== existingClassSession.studentId) {
          // Delete old enrollment
          await tx.studentClassEnrollment.deleteMany({
            where: { classId, studentId: existingClassSession.studentId },
          });

          // Create new enrollment
          await tx.studentClassEnrollment.create({
            data: {
              classId,
              studentId,
              status: "ENROLLED",
            },
          });
        }

        return updatedClassSession;
      });

      return Response.json({
        message: "Standalone class session updated successfully",
        data: result,
      });
    }
  } catch (error) {
    console.error("Error updating class session:", error);
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Invalid request data", issues: error.issues },
        { status: 400 }
      );
    }
    return Response.json(
      {
        error: "Failed to update class session",
        message: error instanceof Error ? error.message : "Unknown error",
      },
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
    const classId = searchParams.get("classId");

    if (!classId) {
      return Response.json(
        { error: "Class session ID is required" },
        { status: 400 }
      );
    }

    // Check if class session exists
    const existingClassSession = await prisma.classSession.findUnique({
      where: { classId },
      include: {
        studentClassEnrollments: true,
      },
    });

    if (!existingClassSession) {
      return Response.json(
        { error: "Class session not found" },
        { status: 404 }
      );
    }

    // Delete class session and related data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete enrollments
      if (existingClassSession.studentClassEnrollments.length > 0) {
        await tx.studentClassEnrollment.deleteMany({
          where: { classId },
        });
      }

      // Delete the class session
      await tx.classSession.delete({
        where: { classId },
      });
    });

    return Response.json({
      message: "Class session deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting class session:", error);
    return Response.json(
      {
        error: "Failed to delete class session",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
