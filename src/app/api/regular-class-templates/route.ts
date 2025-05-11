import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  AvailabilityFilterSchema,
  CreateRegularClassTemplateSchema,
  BatchCreateRegularClassTemplateSchema,
  UpdateRegularClassTemplateSchema,
  TemplateQuerySchema,
} from "@/schemas/regular-class-template.schema";
import { DayOfWeek } from "@prisma/client";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    // New actions for step-by-step template creation flow
    if (action === "compatible-teachers") {
      const studentId = searchParams.get("studentId");
      if (!studentId)
        return Response.json({ error: "studentIdは必須です" }, { status: 400 }); // "studentId required"

      const student = await prisma.student.findUnique({
        where: { studentId },
        include: {
          StudentPreference: {
            include: {
              teachers: true,
              subjects: true,
            },
          },
        },
      });

      if (!student) {
        return Response.json(
          { error: "学生が見つかりません" },
          { status: 404 }
        ); // "Student not found"
      }

      const preferredTeacherIds = student.StudentPreference.flatMap((pref) =>
        pref.teachers.map((t) => t.teacherId)
      );

      const preferredSubjectIds = student.StudentPreference.flatMap((pref) =>
        pref.subjects.map((s) => s.subjectId)
      );

      const preferredTeachers = await prisma.teacher.findMany({
        where: { teacherId: { in: preferredTeacherIds } },
        include: {
          teacherSubjects: { include: { subject: true, subjectType: true } },
          evaluation: true,
        },
      });

      const subjectTeachers = await prisma.teacher.findMany({
        where: {
          teacherSubjects: { some: { subjectId: { in: preferredSubjectIds } } },
          teacherId: { notIn: preferredTeacherIds },
        },
        include: {
          teacherSubjects: { include: { subject: true, subjectType: true } },
          evaluation: true,
        },
      });

      const otherTeachers = await prisma.teacher.findMany({
        where: {
          teacherId: {
            notIn: [
              ...preferredTeacherIds,
              ...subjectTeachers.map((t) => t.teacherId),
            ],
          },
        },
        include: {
          teacherSubjects: { include: { subject: true, subjectType: true } },
          evaluation: true,
        },
      });

      return Response.json({
        data: {
          preferredTeachers,
          subjectTeachers,
          otherTeachers,
          allTeachers: [
            ...preferredTeachers,
            ...subjectTeachers,
            ...otherTeachers,
          ],
        },
      });
    } else if (action === "compatible-students") {
      const teacherId = searchParams.get("teacherId");
      if (!teacherId)
        return Response.json({ error: "teacherIdは必須です" }, { status: 400 }); // "teacherId required"

      const teacher = await prisma.teacher.findUnique({
        where: { teacherId },
        include: { teacherSubjects: true },
      });

      if (!teacher) {
        return Response.json({ error: "先生が見つかりません" }, { status: 404 }); // "Teacher not found"
      }

      const teacherSubjectIds = teacher.teacherSubjects.map(
        (ts) => ts.subjectId
      );

      const preferredStudents = await prisma.student.findMany({
        where: {
          StudentPreference: { some: { teachers: { some: { teacherId } } } },
        },
        include: {
          grade: true,
          StudentPreference: {
            include: {
              subjects: { include: { subject: true, subjectType: true } },
              teachers: { include: { teacher: true } },
              timeSlots: true,
            },
          },
        },
      });

      const subjectStudents = await prisma.student.findMany({
        where: {
          StudentPreference: {
            some: {
              subjects: { some: { subjectId: { in: teacherSubjectIds } } },
            },
          },
          studentId: { notIn: preferredStudents.map((s) => s.studentId) },
        },
        include: {
          grade: true,
          StudentPreference: {
            include: {
              subjects: { include: { subject: true, subjectType: true } },
              teachers: { include: { teacher: true } },
              timeSlots: true,
            },
          },
        },
      });

      const otherStudents = await prisma.student.findMany({
        where: {
          studentId: {
            notIn: [
              ...preferredStudents.map((s) => s.studentId),
              ...subjectStudents.map((s) => s.studentId),
            ],
          },
        },
        include: {
          grade: true,
          StudentPreference: {
            include: {
              subjects: { include: { subject: true, subjectType: true } },
              teachers: { include: { teacher: true } },
              timeSlots: true,
            },
          },
        },
      });

      return Response.json({
        data: {
          preferredStudents,
          subjectStudents,
          otherStudents,
          allStudents: [
            ...preferredStudents,
            ...subjectStudents,
            ...otherStudents,
          ],
        },
      });
    } else if (action === "compatible-subjects") {
      const teacherId = searchParams.get("teacherId");
      const studentId = searchParams.get("studentId");

      if (!teacherId || !studentId) {
        return Response.json(
          { error: "teacherIdとstudentIdは必須です" }, // "teacherId and studentId required"
          { status: 400 }
        );
      }

      const teacher = await prisma.teacher.findUnique({
        where: { teacherId },
        include: {
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
        },
      });

      const student = await prisma.student.findUnique({
        where: { studentId },
        include: {
          StudentPreference: {
            include: {
              subjects: {
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
            },
          },
        },
      });

      if (!teacher || !student) {
        return Response.json(
          { error: "先生または学生が見つかりません" }, // "Teacher or student not found"
          { status: 404 }
        );
      }

      // Get all subject-subjectType pairs that the teacher can teach
      const teacherSubjectPairs = teacher.teacherSubjects.map((ts) => ({
        subjectId: ts.subjectId,
        subjectTypeId: ts.subjectTypeId,
        subject: ts.subject,
        subjectType: ts.subjectType,
      }));

      // Get all subject-subjectType pairs that the student prefers
      const studentSubjectPairs = student.StudentPreference.flatMap((pref) =>
        pref.subjects.map((s) => ({
          subjectId: s.subjectId,
          subjectTypeId: s.subjectTypeId,
          subject: s.subject,
          subjectType: s.subjectType,
        }))
      );

      // Find common pairs (both teacher and student have the same subject-subjectType combination)
      const commonPairs = teacherSubjectPairs.filter((tp) =>
        studentSubjectPairs.some(
          (sp) =>
            sp.subjectId === tp.subjectId &&
            sp.subjectTypeId === tp.subjectTypeId
        )
      );

      // Get other valid pairs that the teacher can teach but the student doesn't prefer
      const otherPairs = teacherSubjectPairs.filter(
        (tp) =>
          !commonPairs.some(
            (cp) =>
              cp.subjectId === tp.subjectId &&
              cp.subjectTypeId === tp.subjectTypeId
          )
      );

      return Response.json({
        data: {
          commonSubjectPairs: commonPairs,
          otherSubjectPairs: otherPairs,
          allSubjectPairs: [...commonPairs, ...otherPairs],
        },
      });
    } else if (action === "available-time-slots") {
      const teacherId = searchParams.get("teacherId");
      const studentId = searchParams.get("studentId");

      if (!teacherId || !studentId) {
        return Response.json(
          { error: "teacherIdとstudentIdは必須です" }, // "teacherId and studentId required"
          { status: 400 }
        );
      }

      const teacherShifts = await prisma.teacherShiftReference.findMany({
        where: { teacherId },
      });

      const studentPrefs = await prisma.studentPreferenceTimeSlot.findMany({
        where: { studentPreference: { studentId } },
      });

      const shiftsByDay: Record<string, (typeof teacherShifts)[number][]> = {};
      teacherShifts.forEach((shift) => {
        if (!shiftsByDay[shift.dayOfWeek]) {
          shiftsByDay[shift.dayOfWeek] = [];
        }
        shiftsByDay[shift.dayOfWeek].push(shift);
      });

      const prefsByDay: Record<string, (typeof studentPrefs)[number][]> = {};
      studentPrefs.forEach((pref) => {
        if (!prefsByDay[pref.dayOfWeek]) {
          prefsByDay[pref.dayOfWeek] = [];
        }
        prefsByDay[pref.dayOfWeek].push(pref);
      });

      const availableSlots = Object.entries(shiftsByDay).flatMap(
        ([day, shifts]) => {
          const studentPrefs = prefsByDay[day] || [];
          return shifts.map((shift) => ({
            dayOfWeek: day,
            startTime: shift.startTime,
            endTime: shift.endTime,
            isPreferredByStudent: studentPrefs.some(
              (pref) =>
                pref.startTime <= shift.endTime &&
                pref.endTime >= shift.startTime
            ),
          }));
        }
      );

      return Response.json({
        data: {
          availableSlots,
          teacherShifts,
          studentPreferences: studentPrefs,
        },
      });
    } else if (action === "available-booths") {
      const dayOfWeek = searchParams.get("dayOfWeek");
      const startTime = searchParams.get("startTime");
      const endTime = searchParams.get("endTime");

      if (!dayOfWeek || !startTime || !endTime) {
        return Response.json(
          { error: "dayOfWeek、startTime、endTimeは必須です" }, // "dayOfWeek, startTime, endTime required"
          { status: 400 }
        );
      }

      const start = new Date(`1970-01-01T${startTime}`);
      const end = new Date(`1970-01-01T${endTime}`);

      const booths = await prisma.booth.findMany({
        where: {
          status: true,
          NOT: {
            regularClassTemplates: {
              some: {
                dayOfWeek: dayOfWeek as DayOfWeek,
                startTime: { lt: end },
                endTime: { gt: start },
              },
            },
          },
        },
      });

      return Response.json({
        data: booths,
      });
    }
    // Special endpoint for finding available slots with filtering
    else if (action === "available-slots") {
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

      // Add subject type filter if provided
      if (filter.subjectTypeId) {
        if (
          typeof teacherQuery.teacherSubjects === "object" &&
          teacherQuery.teacherSubjects !== null
        ) {
          const subjectCondition = teacherQuery.teacherSubjects as Record<
            string,
            unknown
          >;
          if (
            typeof subjectCondition.some === "object" &&
            subjectCondition.some !== null
          ) {
            (subjectCondition.some as Record<string, unknown>).subjectTypeId =
              filter.subjectTypeId;
          }
        } else {
          teacherQuery.teacherSubjects = {
            some: { subjectTypeId: filter.subjectTypeId },
          };
        }
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
          },
        },
        ...(filter.studentId && { studentId: filter.studentId }),
      };

      // Add subject and subject type filters if provided
      if (filter.subjectId || filter.subjectTypeId) {
        const subjectCondition: Record<string, unknown> = {};

        if (filter.subjectId) {
          subjectCondition.subjectId = filter.subjectId;
        }

        if (filter.subjectTypeId) {
          subjectCondition.subjectTypeId = filter.subjectTypeId;
        }

        if (
          typeof studentQuery.StudentPreference === "object" &&
          studentQuery.StudentPreference !== null
        ) {
          const prefCondition = studentQuery.StudentPreference as Record<
            string,
            unknown
          >;
          if (
            typeof prefCondition.some === "object" &&
            prefCondition.some !== null
          ) {
            (prefCondition.some as Record<string, unknown>).subjects = {
              some: subjectCondition,
            };
          }
        }
      }

      // 3. Get availability data with student preferences
      if (filter.studentId) {
        const student = await prisma.student.findUnique({
          where: { studentId: filter.studentId },
          include: {
            StudentPreference: {
              include: {
                teachers: { include: { teacher: true } },
                subjects: { include: { subject: true, subjectType: true } },
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
            teacherSubjects: { include: { subject: true, subjectType: true } },
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
        relevantSubjectTypes,
      ] = await Promise.all([
        // Get compatible teachers
        prisma.teacher.findMany({
          where: teacherQuery,
          include: {
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
                subjects: {
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
          include: {
            subjectToSubjectTypes: {
              include: {
                subjectType: true,
              },
            },
          },
        }),

        // Get relevant subject types
        prisma.subjectType.findMany({
          where: filter.subjectTypeId
            ? { subjectTypeId: filter.subjectTypeId }
            : {}, // Get all if not specified
        }),
      ]);

      return Response.json({
        data: {
          teachers: compatibleTeachers,
          students: compatibleStudents,
          booths: availableBooths,
          subjects: relevantSubjects,
          subjectTypes: relevantSubjectTypes,
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
        subjectTypeId,
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

      if (subjectTypeId) {
        filters.subjectTypeId = subjectTypeId;
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
          booth: true,
          classType: true, // <-- Added to include classType in response
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
        { error: "無効なクエリパラメータです", details: error.errors }, // "Invalid query parameters" (Standardized from "無効なパラメータ")
        { status: 400 }
      );
    }
    console.error("データの取得中にエラーが発生しました:", error); // Existing Japanese message
    return Response.json(
      { error: "データの取得に失敗しました" }, // Existing Japanese message
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 }); // "Forbidden"
  }

  try {
    const body = await request.json();
    const isBatch = Array.isArray(body);

    // Handle single or batch template creation
    if (isBatch) {
      const templates = BatchCreateRegularClassTemplateSchema.parse(body);

      // Before processing, validate all subject/subject type combinations
      const subjectTypePairs = templates.map((template) => ({
        subjectId: template.subjectId,
        subjectTypeId: template.subjectTypeId,
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
            error: "無効な科目と科目タイプの組み合わせです", // "Invalid subject-subject type combinations"
            message: `次の科目と科目タイプの組み合わせは無効です: ${invalidPairs // `The following subject-subject type combinations are not valid: ...`
              .map((p) => `(${p.subjectId}, ${p.subjectTypeId})`)
              .join(", ")}`,
          },
          { status: 400 }
        );
      }

      // Process each template in a transaction
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
              booth: true,
              templateStudentAssignments: {
                include: {
                  student: true,
                },
              },
            },
          });
        })
      );

      return Response.json(
        {
          message: `${results.length}件のテンプレートが正常に作成されました`, // `${results.length} templates created successfully`
          data: results,
        },
        { status: 201 }
      );
    } else {
      // Single template creation
      const template = CreateRegularClassTemplateSchema.parse(body);
      const {
        studentIds,
        startTime,
        endTime,
        startDate,
        endDate,
        ...templateData
      } = template;

      // Validate subject/subject type combination exists
      const subjectTypePair = {
        subjectId: templateData.subjectId,
        subjectTypeId: templateData.subjectTypeId,
      };

      const validPair = await prisma.subjectToSubjectType.findFirst({
        where: {
          subjectId: subjectTypePair.subjectId,
          subjectTypeId: subjectTypePair.subjectTypeId,
        },
      });

      if (!validPair) {
        return Response.json(
          {
            error: "無効な科目と科目タイプの組み合わせです", // "Invalid subject-subject type combination"
            message: `科目ID ${subjectTypePair.subjectId} と科目タイプID ${subjectTypePair.subjectTypeId} の組み合わせは無効です。`, // `The combination of subject ID ${subjectTypePair.subjectId} and subject type ID ${subjectTypePair.subjectTypeId} is not valid.`
          },
          { status: 400 }
        );
      }

      // Convert time strings to Date objects
      const createdTemplate = await prisma.regularClassTemplate.create({
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
          booth: true,
          templateStudentAssignments: {
            include: {
              student: true,
            },
          },
        },
      });

      return Response.json(
        {
          message: "テンプレートが正常に作成されました", // "Template created successfully"
          data: createdTemplate,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "入力値の検証に失敗しました", details: error.errors }, // Existing Japanese message
        { status: 400 }
      );
    }
    console.error("テンプレート作成中にエラーが発生しました:", error); // Existing Japanese message
    return Response.json(
      { error: "テンプレートの作成に失敗しました" }, // Existing Japanese message
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
    const {
      templateId,
      studentIds,
      startTime,
      endTime,
      startDate,
      endDate,
      subjectId,
      subjectTypeId,
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
      return Response.json({ error: "テンプレートが見つかりません" }, { status: 404 }); // "Template not found"
    }

    // If subject or subject type is being updated, validate the combination
    if (subjectId || subjectTypeId) {
      const newSubjectId = subjectId || existingTemplate.subjectId;
      const newSubjectTypeId = subjectTypeId || existingTemplate.subjectTypeId;

      // Check if this combination exists in SubjectToSubjectType
      const validPair = await prisma.subjectToSubjectType.findFirst({
        where: {
          subjectId: newSubjectId,
          subjectTypeId: newSubjectTypeId,
        },
      });

      if (!validPair) {
        return Response.json(
          {
            error: "無効な科目と科目タイプの組み合わせです", // "Invalid subject-subject type combination"
            message: `科目ID ${newSubjectId} と科目タイプID ${newSubjectTypeId} の組み合わせは無効です。`, // `The combination of subject ID ${newSubjectId} and subject type ID ${newSubjectTypeId} is not valid.`
          },
          { status: 400 }
        );
      }
    }

    // Prepare update data with time conversions
    const updateData: Record<string, unknown> = {
      ...data,
      ...(subjectId ? { subjectId } : {}),
      ...(subjectTypeId ? { subjectTypeId } : {}),
    };

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

    // Update template and student assignments in a transaction
    const result = await prisma.$transaction(async (tx) => {
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
          booth: true,
          templateStudentAssignments: {
            include: {
              student: true,
            },
          },
        },
      });
    });

    return Response.json({
      message: "テンプレートが正常に更新されました", // "Template updated successfully"
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "入力値の検証に失敗しました", details: error.errors }, // Existing Japanese message
        { status: 400 }
      );
    }
    console.error("テンプレート更新中にエラーが発生しました:", error); // Existing Japanese message
    return Response.json(
      { error: "テンプレートの更新に失敗しました" }, // Existing Japanese message
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
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return Response.json(
        { error: "テンプレートIDは必須です" }, // "Template ID is required"
        { status: 400 }
      );
    }

    // Check if template exists
    const existingTemplate = await prisma.regularClassTemplate.findUnique({
      where: { templateId },
    });

    if (!existingTemplate) {
      return Response.json(
        { error: "テンプレートが見つかりません" }, // "Template not found"
        { status: 404 }
      );
    }

    // Check for related class sessions before deletion
    const hasRelatedClassSessions = await prisma.classSession.findFirst({
      where: { templateId },
    });

    if (hasRelatedClassSessions) {
      return Response.json(
        {
          error: "関連する授業があるためテンプレートを削除できません", // "Cannot delete template with related class sessions"
        },
        { status: 409 }
      );
    }

    // Delete the template (cascade will handle student assignments)
    await prisma.regularClassTemplate.delete({
      where: { templateId },
    });

    return Response.json({
      message: "テンプレートが正常に削除されました", // "Template deleted successfully"
    });
  } catch (error) {
    console.error("テンプレート削除中にエラーが発生しました", error); // Existing Japanese message
    return Response.json(
      { error: "テンプレートの削除に失敗しました" }, // Existing Japanese message
      { status: 500 }
    );
  }
}
