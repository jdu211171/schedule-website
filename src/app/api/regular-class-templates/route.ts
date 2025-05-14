import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  AvailabilityFilterSchema,
  CreateRegularClassTemplateSchema,
  BatchCreateRegularClassTemplateSchema,
  UpdateRegularClassTemplateSchema,
  TemplateQuerySchema,
  type CreateRegularClassTemplateInput,
} from "@/schemas/regular-class-template.schema";
import { DayOfWeek, Prisma, type Teacher, type Student } from "@prisma/client";
import { ZodError } from "zod";
import {
  findCompatibility,
  validateSubjectTypePair,
  calculateTeacherCompatibilityScore,
  checkTemplateConflicts,
  getSubjectsWithFallback,
  getTimeOverlap,
} from "./service";
import { NextRequest } from "next/server";

// Type for conflict check parameters
type ConflictCheckParams = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  teacherId: string;
  boothId: string;
  studentIds: string[];
  excludeTemplateId?: string;
};

/**
 * GET handler for regular class templates
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  try {
    // Handle specialized actions for template creation flow
    if (action === "compatible-teachers") {
      return await getCompatibleTeachers(searchParams);
    } else if (action === "compatible-students") {
      return await getCompatibleStudents(searchParams);
    } else if (action === "compatible-subjects") {
      return await getCompatibleSubjects(searchParams);
    } else if (action === "available-time-slots") {
      return await getAvailableTimeSlots(searchParams);
    } else if (action === "available-booths") {
      return await getAvailableBooths(searchParams);
    } else if (action === "available-slots") {
      return await getAvailableSlots(searchParams);
    } else {
      // Regular template listing with pagination and filtering
      return await getTemplateList(searchParams);
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "無効なクエリパラメータです", details: error.errors }, // "Invalid query parameters"
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

/**
 * Find compatible teachers for a student
 */
async function getCompatibleTeachers(searchParams: URLSearchParams) {
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return Response.json({ error: "studentIdは必須です" }, { status: 400 }); // "studentId required"
  }

  const student = await prisma.student.findUnique({
    where: { studentId },
    include: {
      grade: true,
      StudentPreference: {
        include: {
          teachers: true,
          subjects: true,
          timeSlots: true,
        },
      },
    },
  });

  if (!student) {
    return Response.json({ error: "学生が見つかりません" }, { status: 404 }); // "Student not found"
  }

  // Handle case where student has no preferences
  const hasMissingPreferences =
    !student.StudentPreference || student.StudentPreference.length === 0;

  // Extract preferred teachers (or empty array if no preferences)
  const preferredTeacherIds = hasMissingPreferences
    ? []
    : student.StudentPreference.flatMap((pref) =>
        pref.teachers.map((t) => t.teacherId)
      );

  // Extract preferred subjects (or use fallback based on grade if no preferences)
  const preferredSubjectIds = hasMissingPreferences
    ? await getSubjectsWithFallback(student.gradeId)
    : student.StudentPreference.flatMap((pref) =>
        pref.subjects.map((s) => s.subjectId)
      );

  // Get teachers in three tiers (preferred, subject-matched, other)
  const preferredTeachers = await prisma.teacher.findMany({
    where: {
      teacherId: {
        in: preferredTeacherIds.length > 0 ? preferredTeacherIds : undefined,
      },
    },
    include: {
      teacherSubjects: { include: { subject: true, subjectType: true } },
      evaluation: true,
      TeacherShiftReference: true,
    },
  });

  const subjectTeachers = await prisma.teacher.findMany({
    where: {
      teacherSubjects: {
        some: {
          subjectId: {
            in:
              preferredSubjectIds.length > 0 ? preferredSubjectIds : undefined,
          },
        },
      },
      teacherId: {
        notIn: preferredTeacherIds.length > 0 ? preferredTeacherIds : [],
      },
    },
    include: {
      teacherSubjects: { include: { subject: true, subjectType: true } },
      evaluation: true,
      TeacherShiftReference: true,
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
      TeacherShiftReference: true,
    },
    take: 20, // Limit for better performance
  });

  // Calculate compatibility scores for each teacher
  const allTeachers = [
    ...preferredTeachers,
    ...subjectTeachers,
    ...otherTeachers,
  ];
  const teachersWithScores = allTeachers.map((teacher) => {
    const timeOverlap = hasMissingPreferences
      ? 1 // If no preferences, assume full overlap
      : getTimeOverlap(teacher, student);

    const score = calculateTeacherCompatibilityScore({
      teacher,
      student,
      isPreferred: preferredTeacherIds.includes(teacher.teacherId),
      timeOverlap,
      subjectMatch: teacher.teacherSubjects.some((ts) =>
        preferredSubjectIds.includes(ts.subjectId)
      ),
    });

    return {
      ...teacher,
      compatibilityScore: score,
      matchDetails: {
        isPreferred: preferredTeacherIds.includes(teacher.teacherId),
        subjectOverlap: teacher.teacherSubjects.filter((ts) =>
          preferredSubjectIds.includes(ts.subjectId)
        ).length,
        timeOverlap,
      },
    };
  });

  // Sort by compatibility score
  const sortedTeachers = teachersWithScores.sort(
    (a, b) => b.compatibilityScore - a.compatibilityScore
  );

  return Response.json({
    data: {
      teachers: sortedTeachers,
      preferredTeachers: preferredTeachers.map((t) => ({
        ...t,
        compatibilityScore:
          teachersWithScores.find((ts) => ts.teacherId === t.teacherId)
            ?.compatibilityScore || 0,
      })),
      subjectTeachers: subjectTeachers.map((t) => ({
        ...t,
        compatibilityScore:
          teachersWithScores.find((ts) => ts.teacherId === t.teacherId)
            ?.compatibilityScore || 0,
      })),
      otherTeachers: otherTeachers.map((t) => ({
        ...t,
        compatibilityScore:
          teachersWithScores.find((ts) => ts.teacherId === t.teacherId)
            ?.compatibilityScore || 0,
      })),
    },
    metadata: {
      preferencesStatus: hasMissingPreferences ? "missing" : "available",
      subjectsSource: hasMissingPreferences
        ? "grade_based_fallback"
        : "student_preference",
    },
  });
}

/**
 * Find compatible students for a teacher
 */
async function getCompatibleStudents(searchParams: URLSearchParams) {
  const teacherId = searchParams.get("teacherId");
  if (!teacherId) {
    return Response.json({ error: "teacherIdは必須です" }, { status: 400 }); // "teacherId required"
  }

  const teacher = await prisma.teacher.findUnique({
    where: { teacherId },
    include: {
      teacherSubjects: true,
      TeacherShiftReference: true,
    },
  });

  if (!teacher) {
    return Response.json({ error: "先生が見つかりません" }, { status: 404 }); // "Teacher not found"
  }

  const teacherSubjectIds = teacher.teacherSubjects.map((ts) => ts.subjectId);
  const teacherSubjectTypeIds = teacher.teacherSubjects.map(
    (ts) => ts.subjectTypeId
  );

  // Get students who prefer this teacher
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

  // Get students who need subjects this teacher can teach
  const subjectStudents = await prisma.student.findMany({
    where: {
      StudentPreference: {
        some: {
          subjects: {
            some: {
              OR: [
                {
                  subjectId: {
                    in:
                      teacherSubjectIds.length > 0
                        ? teacherSubjectIds
                        : undefined,
                  },
                },
                {
                  subjectTypeId: {
                    in:
                      teacherSubjectTypeIds.length > 0
                        ? teacherSubjectTypeIds
                        : undefined,
                  },
                },
              ],
            },
          },
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

  // Get other students
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
    take: 20, // Limit for better performance
  });

  // Calculate compatibility scores
  const allStudents = [
    ...preferredStudents,
    ...subjectStudents,
    ...otherStudents,
  ];
  const studentsWithScores = allStudents.map((student) => {
    const hasPreferences =
      student.StudentPreference && student.StudentPreference.length > 0;
    const timeOverlap = hasPreferences ? getTimeOverlap(teacher, student) : 1; // If no preferences, assume full overlap

    // Calculate compatibility score (reverse of teacher score)
    const score = hasPreferences
      ? calculateTeacherCompatibilityScore({
          teacher,
          student,
          isPreferred: student.StudentPreference.some((pref) =>
            pref.teachers.some((t) => t.teacherId === teacherId)
          ),
          timeOverlap,
          subjectMatch:
            hasPreferences &&
            student.StudentPreference.some((pref) =>
              pref.subjects.some((s) => teacherSubjectIds.includes(s.subjectId))
            ),
        })
      : 50; // Default score for students without preferences

    return {
      ...student,
      compatibilityScore: score,
      matchDetails: {
        prefersTeacher:
          hasPreferences &&
          student.StudentPreference.some((pref) =>
            pref.teachers.some((t) => t.teacherId === teacherId)
          ),
        subjectOverlap: hasPreferences
          ? student.StudentPreference.flatMap((pref) =>
              pref.subjects.filter((s) =>
                teacherSubjectIds.includes(s.subjectId)
              )
            ).length
          : 0,
        timeOverlap,
      },
    };
  });

  // Sort by compatibility score
  const sortedStudents = studentsWithScores.sort(
    (a, b) => b.compatibilityScore - a.compatibilityScore
  );

  return Response.json({
    data: {
      students: sortedStudents,
      preferredStudents: preferredStudents.map((s) => ({
        ...s,
        compatibilityScore:
          studentsWithScores.find((ss) => ss.studentId === s.studentId)
            ?.compatibilityScore || 0,
      })),
      subjectStudents: subjectStudents.map((s) => ({
        ...s,
        compatibilityScore:
          studentsWithScores.find((ss) => ss.studentId === s.studentId)
            ?.compatibilityScore || 0,
      })),
      otherStudents: otherStudents.map((s) => ({
        ...s,
        compatibilityScore:
          studentsWithScores.find((ss) => ss.studentId === s.studentId)
            ?.compatibilityScore || 0,
      })),
    },
  });
}

/**
 * Find compatible subjects for a teacher and student
 */
async function getCompatibleSubjects(searchParams: URLSearchParams) {
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

  // Handle case where student has no preferences
  const hasMissingPreferences =
    !student.StudentPreference || student.StudentPreference.length === 0;

  // Get all subject-subjectType pairs that the teacher can teach
  const teacherSubjectPairs = teacher.teacherSubjects.map((ts) => ({
    subjectId: ts.subjectId,
    subjectTypeId: ts.subjectTypeId,
    subject: ts.subject,
    subjectType: ts.subjectType,
  }));

  // Get all subject-subjectType pairs that the student prefers or fallback to grade-appropriate
  let studentSubjectPairs: Array<{
    subjectId: string;
    subjectTypeId: string;
    subject?: any;
    subjectType?: any;
  }> = [];

  if (hasMissingPreferences) {
    // Fallback: Get grade-appropriate subjects
    const gradeAppropriateSubjectIds = await getSubjectsWithFallback(
      student.gradeId
    );

    // Match with teacher's subject capabilities
    studentSubjectPairs = teacherSubjectPairs.filter((pair) =>
      gradeAppropriateSubjectIds.includes(pair.subjectId)
    );
  } else {
    // Use student's actual preferences
    studentSubjectPairs = student.StudentPreference.flatMap((pref) =>
      pref.subjects.map((s) => ({
        subjectId: s.subjectId,
        subjectTypeId: s.subjectTypeId,
        subject: s.subject,
        subjectType: s.subjectType,
      }))
    );
  }

  // Find common pairs (both teacher and student have the same subject-subjectType combination)
  const commonPairs = teacherSubjectPairs.filter((tp) =>
    studentSubjectPairs.some(
      (sp) =>
        sp.subjectId === tp.subjectId && sp.subjectTypeId === tp.subjectTypeId
    )
  );

  // Get other valid pairs that the teacher can teach but the student doesn't prefer
  const otherPairs = teacherSubjectPairs.filter(
    (tp) =>
      !commonPairs.some(
        (cp) =>
          cp.subjectId === tp.subjectId && cp.subjectTypeId === tp.subjectTypeId
      )
  );

  return Response.json({
    data: {
      commonSubjects: commonPairs,
      otherSubjects: otherPairs,
      allSubjects: [...commonPairs, ...otherPairs],
    },
    metadata: {
      preferencesStatus: hasMissingPreferences ? "missing" : "available",
      subjectsSource: hasMissingPreferences
        ? "grade_based_fallback"
        : "student_preference",
    },
  });
}

/**
 * Find available time slots for a teacher and student
 */
async function getAvailableTimeSlots(searchParams: URLSearchParams) {
  const teacherId = searchParams.get("teacherId");
  const studentId = searchParams.get("studentId");

  if (!teacherId || !studentId) {
    return Response.json(
      { error: "teacherIdとstudentIdは必須です" }, // "teacherId and studentId required"
      { status: 400 }
    );
  }

  const [teacherShifts, student] = await Promise.all([
    prisma.teacherShiftReference.findMany({
      where: { teacherId },
    }),
    prisma.student.findUnique({
      where: { studentId },
      include: {
        StudentPreference: {
          include: {
            timeSlots: true,
          },
        },
      },
    }),
  ]);

  if (!student) {
    return Response.json({ error: "学生が見つかりません" }, { status: 404 });
  }

  // Handle case where student has no preferences
  const hasMissingPreferences =
    !student.StudentPreference || student.StudentPreference.length === 0;

  // Get student's time preferences or use default slots if none
  let studentPrefs: Array<any> = [];

  if (hasMissingPreferences) {
    // Fallback: Use all teacher's shifts as available slots
    studentPrefs = teacherShifts.map((shift) => ({
      dayOfWeek: shift.dayOfWeek,
      startTime: shift.startTime,
      endTime: shift.endTime,
      isDefault: true,
    }));
  } else {
    // Use student's actual time preferences
    studentPrefs = student.StudentPreference.flatMap(
      (pref) => pref.timeSlots || []
    );
  }

  // Organize shifts and preferences by day of week
  const shiftsByDay: Record<string, typeof teacherShifts> = {};
  for (const shift of teacherShifts) {
    if (!shiftsByDay[shift.dayOfWeek]) {
      shiftsByDay[shift.dayOfWeek] = [];
    }
    shiftsByDay[shift.dayOfWeek].push(shift);
  }

  const prefsByDay: Record<string, any[]> = {};
  for (const pref of studentPrefs) {
    if (!prefsByDay[pref.dayOfWeek]) {
      prefsByDay[pref.dayOfWeek] = [];
    }
    prefsByDay[pref.dayOfWeek].push(pref);
  }

  // Find overlapping time slots
  const availableSlots: Array<{
    dayOfWeek: string;
    startTime: Date;
    endTime: Date;
    isPreferredByStudent: boolean;
    isDefaultSlot: boolean;
    overlapCount: number;
  }> = [];

  for (const [day, shifts] of Object.entries(shiftsByDay)) {
    const dayPrefs = prefsByDay[day] || [];
    for (const shift of shifts) {
      const overlappingPrefs = dayPrefs.filter(
        (pref) =>
          pref.startTime <= shift.endTime && pref.endTime >= shift.startTime
      );

      availableSlots.push({
        dayOfWeek: day,
        startTime: shift.startTime,
        endTime: shift.endTime,
        isPreferredByStudent: overlappingPrefs.length > 0,
        isDefaultSlot: hasMissingPreferences,
        overlapCount: overlappingPrefs.length,
      });
    }
  }

  // Check for existing classes that would conflict
  const existingClasses = await prisma.regularClassTemplate.findMany({
    where: {
      OR: [
        { teacherId },
        { templateStudentAssignments: { some: { studentId } } },
      ],
    },
  });

  // Mark slots with conflicts
  const slotsWithConflicts = availableSlots.map((slot) => {
    const conflictingClasses = existingClasses.filter(
      (cls) =>
        cls.dayOfWeek === (slot.dayOfWeek as DayOfWeek) &&
        cls.startTime <= slot.endTime &&
        cls.endTime >= slot.startTime
    );

    return {
      ...slot,
      hasConflicts: conflictingClasses.length > 0,
      conflictCount: conflictingClasses.length,
      conflicts: conflictingClasses.map((c) => ({
        templateId: c.templateId,
        type: c.teacherId === teacherId ? "TEACHER" : "STUDENT",
      })),
    };
  });

  return Response.json({
    data: {
      availableSlots: slotsWithConflicts,
      teacherShifts,
      studentPreferences: studentPrefs,
    },
    metadata: {
      preferencesStatus: hasMissingPreferences ? "missing" : "available",
      timeSlotsSource: hasMissingPreferences
        ? "teacher_shift_fallback"
        : "student_preference",
    },
  });
}

/**
 * Find available booths for a specific time
 */
async function getAvailableBooths(searchParams: URLSearchParams) {
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

  // Check for holidays
  const holidays = await prisma.event.findMany({
    where: {
      OR: [
        {
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
          // Check if this is a recurring event on the selected day
          isRecurring: true,
        },
      ],
    },
  });

  const isHoliday = holidays.length > 0;

  // Get all booths, including those with bookings for better filtering
  const allBooths = await prisma.booth.findMany({
    where: {
      status: true,
    },
    include: {
      regularClassTemplates: {
        where: {
          dayOfWeek: dayOfWeek as DayOfWeek,
          startTime: { lt: end },
          endTime: { gt: start },
        },
      },
    },
  });

  // Filter out booths with existing bookings
  const availableBooths = allBooths
    .filter((booth) => booth.regularClassTemplates.length === 0)
    .map((booth) => ({
      ...booth,
      regularClassTemplates: undefined, // Remove this from response
    }));

  // Get utilization statistics for all booths
  const boothUtilization = await prisma.regularClassTemplate.groupBy({
    by: ["boothId"],
    _count: {
      boothId: true,
    },
  });

  // Add utilization stats to response
  const boothsWithStats = availableBooths.map((booth) => {
    const utilization = boothUtilization.find(
      (bu) => bu.boothId === booth.boothId
    );
    return {
      ...booth,
      utilizationCount: utilization?._count.boothId || 0,
    };
  });

  // Sort by utilization (least used first)
  const sortedBooths = boothsWithStats.sort(
    (a, b) => a.utilizationCount - b.utilizationCount
  );

  return Response.json({
    data: sortedBooths,
    metadata: {
      totalBooths: allBooths.length,
      availableBooths: availableBooths.length,
      isHoliday,
    },
  });
}

/**
 * Find available slots with advanced filtering
 */
async function getAvailableSlots(searchParams: URLSearchParams) {
  const filterParams = Object.fromEntries(searchParams.entries());
  const filter = AvailabilityFilterSchema.parse(filterParams);

  // Call the service function to find compatibility
  const compatibility = await findCompatibility(filter);

  return Response.json({
    data: {
      ...compatibility,
      timeSlot: {
        dayOfWeek: filter.dayOfWeek,
        startTime: filter.startTime,
        endTime: filter.endTime,
      },
    },
  });
}

/**
 * Get template list with pagination and filtering
 */
async function getTemplateList(searchParams: URLSearchParams) {
  const queryParams = Object.fromEntries(searchParams.entries());
  const query = TemplateQuerySchema.parse(queryParams);

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

  const filters: Record<string, any> = {};

  if (dayOfWeek) {
    filters["dayOfWeek"] = dayOfWeek;
  }

  if (teacherId) {
    filters["teacherId"] = teacherId;
  }

  if (subjectId) {
    filters["subjectId"] = subjectId;
  }

  if (subjectTypeId) {
    filters["subjectTypeId"] = subjectTypeId;
  }

  if (boothId) {
    filters["boothId"] = boothId;
  }

  if (studentId) {
    filters["templateStudentAssignments"] = {
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
      classType: true,
      templateStudentAssignments: {
        include: {
          student: true,
        },
      },
    },
  });

  // Add related class sessions count for each template
  const templatesWithSessionCount = await Promise.all(
    templates.map(async (template) => {
      const sessionCount = await prisma.classSession.count({
        where: { templateId: template.templateId },
      });

      return {
        ...template,
        sessionCount,
      };
    })
  );

  return Response.json({
    data: templatesWithSessionCount,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
}

/**
 * POST handler for creating regular class templates (single or batch)
 */
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
      return await createBatchTemplates(body);
    } else {
      return await createSingleTemplate(body);
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

/**
 * Create a batch of templates
 */
async function createBatchTemplates(body: any) {
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
        message: `次の科目と科目タイプの組み合わせは無効です: ${invalidPairs
          .map((p) => `(${p.subjectId}, ${p.subjectTypeId})`)
          .join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Check for conflicts before creating templates
  const conflicts = await Promise.all(
    templates.map((template) =>
      checkTemplateConflicts({
        dayOfWeek: template.dayOfWeek,
        startTime: template.startTime,
        endTime: template.endTime,
        teacherId: template.teacherId,
        boothId: template.boothId,
        studentIds: template.studentIds,
      })
    )
  );

  // If any template has conflicts, return error with details
  const hasConflicts = conflicts.some((conflict) => conflict.hasConflicts);
  if (hasConflicts) {
    const conflictDetails = templates
      .map((template, index) => ({
        template,
        conflicts: conflicts[index],
      }))
      .filter((item) => item.conflicts.hasConflicts);

    return Response.json(
      {
        error: "テンプレート作成時に競合が検出されました", // "Conflicts detected when creating templates"
        details: conflictDetails,
      },
      { status: 409 }
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
}

/**
 * Create a single template
 */
async function createSingleTemplate(body: any) {
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
  const isValidPair = await validateSubjectTypePair(
    templateData.subjectId,
    templateData.subjectTypeId
  );

  if (!isValidPair) {
    return Response.json(
      {
        error: "無効な科目と科目タイプの組み合わせです", // "Invalid subject-subject type combination"
        message: `科目ID ${templateData.subjectId} と科目タイプID ${templateData.subjectTypeId} の組み合わせは無効です。`, // `The combination of subject ID ${subjectTypePair.subjectId} and subject type ID ${subjectTypePair.subjectTypeId} is not valid.`
      },
      { status: 400 }
    );
  }

  // Check for conflicts
  const conflicts = await checkTemplateConflicts({
    dayOfWeek: template.dayOfWeek,
    startTime,
    endTime,
    teacherId: templateData.teacherId,
    boothId: templateData.boothId,
    studentIds,
  });

  if (conflicts.hasConflicts) {
    return Response.json(
      {
        error: "テンプレート作成時に競合が検出されました", // "Conflicts detected when creating template"
        details: conflicts,
      },
      { status: 409 }
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

/**
 * PUT handler for updating regular class templates
 */
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
      dayOfWeek,
      teacherId,
      boothId,
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
      return Response.json(
        { error: "テンプレートが見つかりません" },
        { status: 404 }
      ); // "Template not found"
    }

    // If subject or subject type is being updated, validate the combination
    if (subjectId || subjectTypeId) {
      const newSubjectId = subjectId || existingTemplate.subjectId;
      const newSubjectTypeId = subjectTypeId || existingTemplate.subjectTypeId;

      const isValidPair = await validateSubjectTypePair(
        newSubjectId,
        newSubjectTypeId
      );

      if (!isValidPair) {
        return Response.json(
          {
            error: "無効な科目と科目タイプの組み合わせです", // "Invalid subject-subject type combination"
            message: `科目ID ${newSubjectId} と科目タイプID ${newSubjectTypeId} の組み合わせは無効です。`, // `The combination of subject ID ${newSubjectId} and subject type ID ${newSubjectTypeId} is not valid.`
          },
          { status: 400 }
        );
      }
    }

    // Check for conflicts if time or day or resources are changing
    if (
      dayOfWeek ||
      startTime ||
      endTime ||
      teacherId ||
      boothId ||
      studentIds
    ) {
      const updatedDayOfWeek = dayOfWeek || existingTemplate.dayOfWeek;
      const updatedStartTime =
        startTime || existingTemplate.startTime.toTimeString().slice(0, 5);
      const updatedEndTime =
        endTime || existingTemplate.endTime.toTimeString().slice(0, 5);
      const updatedTeacherId = teacherId || existingTemplate.teacherId;
      const updatedBoothId = boothId || existingTemplate.boothId;
      const updatedStudentIds =
        studentIds ||
        existingTemplate.templateStudentAssignments.map((tsa) => tsa.studentId);

      const conflicts = await checkTemplateConflicts({
        dayOfWeek: updatedDayOfWeek,
        startTime: updatedStartTime,
        endTime: updatedEndTime,
        teacherId: updatedTeacherId,
        boothId: updatedBoothId,
        studentIds: updatedStudentIds,
        excludeTemplateId: templateId, // Exclude the current template from conflict checks
      });

      if (conflicts.hasConflicts) {
        return Response.json(
          {
            error: "テンプレート更新時に競合が検出されました", // "Conflicts detected when updating template"
            details: conflicts,
          },
          { status: 409 }
        );
      }
    }

    // Prepare update data with time conversions
    const updateData: Record<string, any> = {
      ...data,
      ...(subjectId ? { subjectId } : {}),
      ...(subjectTypeId ? { subjectTypeId } : {}),
      ...(dayOfWeek ? { dayOfWeek } : {}),
      ...(teacherId ? { teacherId } : {}),
      ...(boothId ? { boothId } : {}),
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

    // Get the count of class sessions using this template
    const sessionCount = await prisma.classSession.count({
      where: { templateId },
    });

    return Response.json({
      message: "テンプレートが正常に更新されました", // "Template updated successfully"
      data: {
        ...result,
        sessionCount,
      },
      affectedSessions:
        sessionCount > 0
          ? {
              count: sessionCount,
              warning:
                "このテンプレートに関連する授業が存在します。テンプレートの変更は、今後生成される授業にのみ影響します。", // "This template has related class sessions. Changes to the template will only affect future generated sessions."
            }
          : null,
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

/**
 * DELETE handler for deleting regular class templates
 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 }); // "Forbidden"
  }

  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
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
    const relatedClassSessions = await prisma.classSession.findMany({
      where: { templateId },
      take: 10, // Limit for performance
    });

    if (relatedClassSessions.length > 0) {
      // Get total count
      const totalCount = await prisma.classSession.count({
        where: { templateId },
      });

      return Response.json(
        {
          error: "関連する授業があるためテンプレートを削除できません", // "Cannot delete template with related class sessions"
          details: {
            sessionCount: totalCount,
            examples: relatedClassSessions,
            message:
              "このテンプレートには関連する授業が存在します。テンプレートを削除する前に、関連する授業を別のテンプレートに移動するか、授業を削除してください。", // "This template has related class sessions. Please move these sessions to another template or delete them before deleting this template."
          },
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
