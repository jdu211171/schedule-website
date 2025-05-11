import {
  ClassSessionQuerySchema,
  CreateClassSessionFromTemplateSchema,
  CreateClassSessionSchema, // Added this import
  UpdateStandaloneClassSessionSchema,
  UpdateTemplateClassSessionSchema,
} from "@/schemas/class-session.schema";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { ZodError } from "zod";
import { DayOfWeek, Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
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
        filters.subjectTypeId = { in: subjectTypeId };
      } else {
        filters.subjectTypeId = subjectTypeId;
      }
    }

    // Handle single date filter
    if (date) {
      const dateParts = date.split("-");
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
      const startDateParts = startDate.split("-");
      const endDateParts = endDate.split("-");
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
      const startDateParts = startDate.split("-");
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
      const endDateParts = endDate.split("-");
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
          dayOfWeek: { in: dayOfWeek as DayOfWeek[] },
        };
      } else {
        filters.regularClassTemplate = {
          dayOfWeek: dayOfWeek as DayOfWeek,
        };
      }
    }

    // Handle isTemplateInstance filter
    if (isTemplateInstance === "true") {
      filters.templateId = { not: null };
    } else if (isTemplateInstance === "false") {
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
        { error: "無効なクエリパラメータです", details: error.errors }, // "Invalid query parameters"
        { status: 400 }
      );
    }
    return Response.json(
      { error: "授業セッションの取得に失敗しました" }, // "Failed to fetch class sessions"
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 });  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 });  }

  try {
    const body = await request.json();

    // Check if this is a template-based class session or a standalone class session
    const isTemplateBasedClass = body.templateId !== undefined;

    if (isTemplateBasedClass) {
      // Validate template-based class session data
      const validatedData = CreateClassSessionFromTemplateSchema.parse(body);
      const {
        templateId,
        date,
        startTime,
        endTime,
        boothId,
        subjectTypeId,
        notes,
      } = validatedData;

      // Fetch template data
      const template = await prisma.regularClassTemplate.findUnique({
        where: { templateId },
        include: {
          subject: true,
        },
      });

      if (!template) {
        return Response.json({ error: "テンプレートが見つかりません" }, { status: 404 }); // "Template not found"
      }

      // If a new subject type is provided, validate it exists and is compatible with the subject
      if (subjectTypeId) {
        const subjectTypeExists = await prisma.subjectType.findUnique({
          where: { subjectTypeId },
        });
        if (!subjectTypeExists) {
          return Response.json({ error: "指定された科目タイプが見つかりません" }, { status: 404 }); // "Specified subject type not found"
        }
        // Check compatibility with template's subject
        const subjectToSubjectType = await prisma.subjectToSubjectType.findUnique({
          where: {
            subjectId_subjectTypeId: {
              subjectId: template.subjectId,
              subjectTypeId: subjectTypeId,
            },
          },
        });
        if (!subjectToSubjectType) {
          return Response.json({ error: "科目は指定された科目タイプと互換性がありません" }, { status: 400 }); // "Subject is not compatible with the specified subject type"
        }
      }

      // Get students assigned to the template
      const studentAssignments =
        await prisma.templateStudentAssignment.findMany({
          where: { templateId },
        });

      if (studentAssignments.length === 0) {
        return Response.json({ error: "テンプレートに割り当てられた生徒がいません" }, { status: 400 }); // "No students assigned to the template"
      }

      // Check for conflicts and validate the resources
      // Use the provided overrides or default to template values
      const classStartTime = startTime
        ? new Date(`1970-01-01T${startTime}Z`) // Ensure UTC for time-only fields
        : template.startTime;
      const classEndTime = endTime
        ? new Date(`1970-01-01T${endTime}Z`) // Ensure UTC for time-only fields
        : template.endTime;
      const classBoothId = boothId || template.boothId;
      const classSubjectTypeId = subjectTypeId || template.subjectTypeId;

      // Check if booth exists
      const boothExists = await prisma.booth.findUnique({
        where: { boothId: classBoothId },
      });

      if (!boothExists) {
        return Response.json({ error: "ブースが見つかりません" }, { status: 404 }); // "Booth not found"
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
            error: "ブースは既にこの時間に予約されています", // "Booth is already booked for this time"
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
            error: "講師は既にこの時間に予約されています", // "Teacher is already booked for this time"
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
              `生徒 ${assignment.studentId} には競合があり、スキップされます` // `Student ${assignment.studentId} has a conflict and will be skipped`
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
              subjectTypeId: classSubjectTypeId,
              boothId: classBoothId,
              classTypeId: template.classTypeId, // <-- use the template's classTypeId
              templateId: templateId,
              notes: notes,
            },
            include: {
              booth: true,
              classType: true,
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
          message: "テンプレートから授業セッションが正常に作成されました", // "Class sessions created successfully from template"
          data: result,
        },
        { status: 201 }
      );
    } else {
      // This is for standalone class sessions
      try {
        // Validate standalone class session data
        // startTime and endTime will now be Date objects from the schema transform
        const validatedData = CreateClassSessionSchema.parse(body);
        const {
          date,
          startTime, // Now a Date object
          endTime,   // Now a Date object
          teacherId,
          studentId,
          subjectId,
          subjectTypeId,
          boothId,
          classTypeId,
          notes,
        } = validatedData;

        // Verify teacher exists
        const teacher = await prisma.teacher.findUnique({
          where: { teacherId: teacherId },
        });
        if (!teacher) {
          return Response.json({ error: "講師が見つかりません" }, { status: 404 }); // "Teacher not found"
        }

        // Verify student exists
        const student = await prisma.student.findUnique({
          where: { studentId: studentId },
        });
        if (!student) {
          return Response.json({ error: "生徒が見つかりません" }, { status: 404 }); // "Student not found"
        }

        // Verify subject exists
        const subject = await prisma.subject.findUnique({
          where: { subjectId: subjectId },
        });
        if (!subject) {
          return Response.json({ error: "科目が見つかりません" }, { status: 404 }); // "Subject not found"
        }

        // Verify subject type exists
        const subjectType = await prisma.subjectType.findUnique({
          where: { subjectTypeId: subjectTypeId },
        });
        if (!subjectType) {
          return Response.json({ error: "科目タイプが見つかりません" }, { status: 404 }); // "Subject type not found"
        }

        // Verify subject and subject type compatibility
        const subjectToSubjectType = await prisma.subjectToSubjectType.findUnique({
            where: {
                subjectId_subjectTypeId: {
                    subjectId: subjectId,
                    subjectTypeId: subjectTypeId,
                },
            },
        });
        if (!subjectToSubjectType) {
            return Response.json({ error: "科目は指定された科目タイプと互換性がありません" }, { status: 400 }); // "Subject is not compatible with the specified subject type"
        }


        // Verify booth exists
        const booth = await prisma.booth.findUnique({
          where: { boothId: boothId },
        });
        if (!booth) {
          return Response.json({ error: "ブースが見つかりません" }, { status: 404 }); // "Booth not found"
        }

        // Verify class type exists
        const classType = await prisma.classType.findUnique({
          where: { classTypeId: classTypeId },
        });
        if (!classType) {
          return Response.json({ error: "授業タイプが見つかりません" }, { status: 404 }); // "Class type not found"
        }

        // TODO: Add conflict checking (teacher availability, student availability, booth availability)

        // Create the class session and enroll the student in a transaction
        const newClassSession = await prisma.$transaction(async (tx) => {
          const createdSession = await tx.classSession.create({
            data: {
              date, // Already a Date object
              startTime, // Already a Date object, transformed by Zod
              endTime,   // Already a Date object, transformed by Zod
              teacherId,
              studentId,
              subjectId,
              subjectTypeId,
              boothId,
              classTypeId,
              notes,
            },
          });

          // Enroll the student in the newly created class session
          await tx.studentClassEnrollment.create({
            data: {
              studentId: studentId,
              classId: createdSession.classId,
              status: "ENROLLED", // Assuming a default status. Adjust if your schema has other required fields for enrollment
            },
          });
          return createdSession;
        });


        return Response.json(
          { message: "授業セッションが正常に作成されました", data: newClassSession }, // "Class session created successfully"
          { status: 201 }
        );
      } catch (error) {
        console.error("授業セッションの作成エラー:", error); // "Class session creation error:"
        if (error instanceof ZodError) {
          return Response.json(
            { error: "無効なリクエストデータです", details: error.errors }, // "Invalid request data"
            { status: 400 }
          );
        }
        return Response.json(
          {
            error: "授業セッションの作成に失敗しました", // "Failed to create class session"
            message: error instanceof Error ? error.message : "不明なエラーです", // "Unknown error"
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("授業セッションの作成エラー:", error); // "Error creating class session:"
    if (error instanceof ZodError) {
      return Response.json(
        { error: "無効なリクエストデータです", issues: error.issues }, // "Invalid request data"
        { status: 400 }
      );
    }
    return Response.json(
      {
        error: "授業セッションの作成に失敗しました",
        message: error instanceof Error ? error.message : "不明なエラーです", // "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 }); // "Forbidden"
  }

  try {
    const body = await request.json();
    const { classId } = body;

    if (!classId) {
      return Response.json(
        { error: "授業セッションIDは必須です" }, // "Class session ID is required"
        { status: 400 }
      );
    }

    // Check if class session exists
    const existingClassSession = await prisma.classSession.findUnique({
      where: { classId },
    });

    if (!existingClassSession) {
      return Response.json(
        { error: "授業セッションが見つかりません" }, // "Class session not found"
        { status: 404 }
      );
    }

    // Determine whether this is a template-based class session
    const isTemplateBasedClass = existingClassSession.templateId !== null;

    if (isTemplateBasedClass) {
      // For template-based class sessions, only allow modifying specific fields
      const validatedData = UpdateTemplateClassSessionSchema.parse(body);
      const { startTime, endTime, boothId, subjectTypeId, notes } =
        validatedData;

      // Prepare data for update
      const updateData: Prisma.ClassSessionUpdateInput = {};

      if (subjectTypeId !== undefined) {
        // First check if the subject type exists
        const subjectTypeExists = await prisma.subjectType.findUnique({
          where: { subjectTypeId },
        });

        if (!subjectTypeExists) {
          return Response.json(
            { error: "科目タイプが見つかりません" }, // "Subject type not found"
            { status: 404 }
          );
        }

        // Then verify the subject-subject type combination is valid
        const validPair = await prisma.subjectToSubjectType.findFirst({
          where: {
            subjectId: existingClassSession.subjectId,
            subjectTypeId,
          },
        });

        if (!validPair) {
          return Response.json(
            {
              error: "無効な科目と科目タイプの組み合わせです", // "Invalid subject-subject type combination"
              message: `科目 (${existingClassSession.subjectId}) は指定された科目タイプ (${subjectTypeId}) に関連付けることができません。`, // `The subject (${existingClassSession.subjectId}) cannot be associated with the specified subject type (${subjectTypeId}).`
            },
            { status: 400 }
          );
        }

        updateData.subjectType = { connect: { subjectTypeId } };
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
          return Response.json({ error: "ブースが見つかりません" }, { status: 404 }); // "Booth not found"
        }

        updateData.booth = { connect: { boothId } };
      }

      // Handle time updates
      if (startTime !== undefined || endTime !== undefined) {
        const originalStart = existingClassSession.startTime;
        const originalEnd = existingClassSession.endTime;

        // Convert strings to Date objects
        const newStart = startTime
          ? new Date(`1970-01-01T${startTime}Z`) // Add 'Z' to specify UTC
          : originalStart;
        const newEnd = endTime
          ? new Date(`1970-01-01T${endTime}Z`) // Add 'Z' to specify UTC
          : originalEnd;

        // Validate time range
        if (newEnd <= newStart) {
          return Response.json(
            { error: "終了時刻は開始時刻より後でなければなりません" }, // "End time must be after start time"
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

        const boothConflicts = await prisma.classSession.findMany({
          where: {
            classId: { not: classId }, // Exclude the current session
            date: existingClassSession.date,
            boothId: boothToCheck,
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

        if (boothConflicts.length > 0) {
          return Response.json(
            {
              error: "ブースは既にこの時間に予約されています", // "Booth is already booked for this time"
              conflicts: boothConflicts,
            },
            { status: 409 }
          );
        }

        // Check for teacher conflicts
        const teacherConflicts = await prisma.classSession.findMany({
          where: {
            classId: { not: classId }, // Exclude the current session
            date: existingClassSession.date,
            teacherId: existingClassSession.teacherId,
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

        if (teacherConflicts.length > 0) {
          return Response.json(
            {
              error: "講師は既にこの時間に予約されています", // "Teacher is already booked for this time"
              conflicts: teacherConflicts,
            },
            { status: 409 }
          );
        }

        // Check for student conflicts
        const studentConflicts = await prisma.classSession.findMany({
          where: {
            classId: { not: classId }, // Exclude the current session
            date: existingClassSession.date,
            studentId: existingClassSession.studentId,
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

        if (studentConflicts.length > 0) {
          return Response.json(
            {
              error: "生徒は既にこの時間に予約されています", // "Student is already booked for this time"
              conflicts: studentConflicts,
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
          teacher: true,
          student: true,
          regularClassTemplate: true,
        },
      });

      return Response.json({
        message: "テンプレートベースの授業セッションが正常に更新されました", // "Template-based class session updated successfully"
        data: updatedClassSession,
      });
    } else {
      // For standalone class sessions, allow modifying all relevant fields
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

      const updateData: Prisma.ClassSessionUpdateInput = {};

      if (date) {
        updateData.date = new Date(date);
      }
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      if (teacherId !== undefined) {
        const teacherExists = await prisma.teacher.findUnique({
          where: { teacherId },
        });
        if (!teacherExists) {
          return Response.json(
            { error: "先生が見つかりません" }, // "Teacher not found"
            { status: 404 }
          );
        }
        updateData.teacher = { connect: { teacherId } };
      }
      if (studentId !== undefined) {
        const studentExists = await prisma.student.findUnique({
          where: { studentId },
        });
        if (!studentExists) {
          return Response.json(
            { error: "生徒が見つかりません" }, // "Student not found"
            { status: 404 }
          );
        }
        updateData.student = { connect: { studentId } };

        // Update enrollment if studentId changes
        if (studentId !== existingClassSession.studentId) {
          await prisma.studentClassEnrollment.updateMany({
            where: { classId: classId },
            data: { studentId: studentId },
          });
        }
      }
      if (subjectId !== undefined) {
        const subjectExists = await prisma.subject.findUnique({
          where: { subjectId },
        });
        if (!subjectExists) {
          return Response.json(
            { error: "科目が見つかりません" }, // "Subject not found"
            { status: 404 }
          );
        }
        updateData.subject = { connect: { subjectId } };
      }
      if (subjectTypeId !== undefined) {
        const subjectTypeExists = await prisma.subjectType.findUnique({
          where: { subjectTypeId },
        });
        if (!subjectTypeExists) {
          return Response.json(
            { error: "科目タイプが見つかりません" }, // "Subject type not found"
            { status: 404 }
          );
        }
        updateData.subjectType = { connect: { subjectTypeId } };
      }
      if (boothId !== undefined) {
        const boothExists = await prisma.booth.findUnique({
          where: { boothId },
        });
        if (!boothExists) {
          return Response.json(
            { error: "ブースが見つかりません" }, // "Booth not found"
            { status: 404 }
          );
        }
        updateData.booth = { connect: { boothId } };
      }
      if (classTypeId !== undefined) {
        const classTypeExists = await prisma.classType.findUnique({
          where: { classTypeId },
        });
        if (!classTypeExists) {
          return Response.json(
            { error: "授業タイプが見つかりません" }, // "Class type not found"
            { status: 404 }
          );
        }
        updateData.classType = { connect: { classTypeId } };
      }

      // Verify subject-subject type combination if either is updated
      const finalSubjectIdToCheck = subjectId || existingClassSession.subjectId;
      const finalSubjectTypeIdToCheck =
        subjectTypeId || existingClassSession.subjectTypeId;

      if (subjectId !== undefined || subjectTypeId !== undefined) {
        const validPair = await prisma.subjectToSubjectType.findFirst({
          where: {
            subjectId: finalSubjectIdToCheck,
            subjectTypeId: finalSubjectTypeIdToCheck,
          },
        });

        if (!validPair) {
          return Response.json(
            {
              error: "無効な科目と科目タイプの組み合わせです", // "Invalid subject-subject type combination"
              message: `科目 (${finalSubjectIdToCheck}) は指定された科目タイプ (${finalSubjectTypeIdToCheck}) に関連付けることができません。`, // `The subject (${finalSubjectIdToCheck}) cannot be associated with the specified subject type (${finalSubjectTypeIdToCheck}).`
            },
            { status: 400 }
          );
        }
      }

      // Handle time updates
      if (startTime !== undefined || endTime !== undefined) {
        const originalStart = existingClassSession.startTime;
        const originalEnd = existingClassSession.endTime;

        const newStart = startTime
          ? new Date(`1970-01-01T${startTime}Z`) // Add 'Z' to specify UTC
          : originalStart;
        const newEnd = endTime
          ? new Date(`1970-01-01T${endTime}Z`) // Add 'Z' to specify UTC
          : originalEnd;

        if (newEnd <= newStart) {
          return Response.json(
            { error: "終了時刻は開始時刻より後でなければなりません" }, // "End time must be after start time"
            { status: 400 }
          );
        }

        const durationMs = newEnd.getTime() - newStart.getTime();
        const durationDate = new Date(durationMs);

        updateData.startTime = newStart;
        updateData.endTime = newEnd;
        updateData.duration = durationDate;
      }

      // Check for conflicts if date, time, booth, teacher, or student is changed
      const finalDate: Date = date ? new Date(date) : existingClassSession.date;
      const finalStartTime: Date =
        (updateData.startTime as Date | undefined) || existingClassSession.startTime;
      const finalEndTime: Date =
        (updateData.endTime as Date | undefined) || existingClassSession.endTime;
      const finalBoothId: string = boothId || existingClassSession.boothId;
      const finalTeacherId: string = teacherId || existingClassSession.teacherId;
      const finalStudentId: string = studentId || existingClassSession.studentId;

      // Booth conflicts
      const boothConflicts = await prisma.classSession.findMany({
        where: {
          classId: { not: classId },
          date: finalDate,
          boothId: finalBoothId,
          AND: [
            {
              OR: [
                {
                  startTime: {
                    lt: finalEndTime,
                  },
                  endTime: {
                    gt: finalStartTime,
                  },
                },
                { startTime: { equals: finalStartTime } },
                { endTime: { equals: finalEndTime } },
              ],
            },
          ],
        },
      });

      if (boothConflicts.length > 0) {
        return Response.json(
          {
            error: "ブースは既にこの時間に予約されています", // "Booth is already booked for this time"
            conflicts: boothConflicts,
          },
          { status: 409 }
        );
      }

      // Teacher conflicts
      const teacherConflicts = await prisma.classSession.findMany({
        where: {
          classId: { not: classId },
          date: finalDate,
          teacherId: finalTeacherId,
          AND: [
            {
              OR: [
                {
                  startTime: {
                    lt: finalEndTime,
                  },
                  endTime: {
                    gt: finalStartTime,
                  },
                },
                { startTime: { equals: finalStartTime } },
                { endTime: { equals: finalEndTime } },
              ],
            },
          ],
        },
      });

      if (teacherConflicts.length > 0) {
        return Response.json(
          {
            error: "講師は既にこの時間に予約されています", // "Teacher is already booked for this time"
            conflicts: teacherConflicts,
          },
          { status: 409 }
        );
      }

      // Student conflicts
      const studentConflicts = await prisma.classSession.findMany({
        where: {
          classId: { not: classId },
          date: finalDate,
          studentId: finalStudentId,
          AND: [
            {
              OR: [
                {
                  startTime: {
                    lt: finalEndTime,
                  },
                  endTime: {
                    gt: finalStartTime,
                  },
                },
                { startTime: { equals: finalStartTime } },
                { endTime: { equals: finalEndTime } },
              ],
            },
          ],
        },
      });

      if (studentConflicts.length > 0) {
        return Response.json(
          {
            error: "生徒は既にこの時間に予約されています", // "Student is already booked for this time"
            conflicts: studentConflicts,
          },
          { status: 409 }
        );
      }

      // Update the class session
      const updatedClassSession = await prisma.classSession.update({
        where: { classId },
        data: updateData,
        include: {
          booth: true,
          classType: true,
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
          teacher: true,
          student: true,
        },
      });

      return Response.json({
        message: "授業セッションが正常に更新されました", // "Class session updated successfully"
        data: updatedClassSession,
      });
    }
  } catch (error) {
    console.error("授業セッションの更新エラー:", error); // "Error updating class session"
    if (error instanceof ZodError) {
      return Response.json(
        { error: "無効なリクエストデータです", issues: error.issues }, // "Invalid request data"
        { status: 400 }
      );
    }
    return Response.json(
      {
        error: "授業セッションの更新に失敗しました", // "Failed to update class session"
        message: error instanceof Error ? error.message : "不明なエラーです", // "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 }); // "Forbidden"
  }

  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return Response.json(
        { error: "授業セッションIDは必須です" }, // "Class session ID is required"
        { status: 400 }
      );
    }

    // Check if class session exists
    const existingClassSession = await prisma.classSession.findUnique({
      where: { classId },
    });

    if (!existingClassSession) {
      return Response.json(
        { error: "授業セッションが見つかりません" }, // "Class session not found"
        { status: 404 }
      );
    }

    // Delete related enrollments first
    await prisma.studentClassEnrollment.deleteMany({
      where: { classId },
    });

    // Then delete the class session
    await prisma.classSession.delete({
      where: { classId },
    });

    return Response.json({
      message: "授業セッションが正常に削除されました", // "Class session deleted successfully"
    });
  } catch (error) {
    console.error("授業セッションの削除エラー:", error); // "Error deleting class session:"
    return Response.json(
      {
        error: "授業セッションの削除に失敗しました", // "Failed to delete class session"
        message: error instanceof Error ? error.message : "不明なエラーです", // "Unknown error"
      },
      { status: 500 }
    );
  }
}
