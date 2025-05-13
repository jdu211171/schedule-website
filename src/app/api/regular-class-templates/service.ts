// src/app/api/regular-class-templates/service.ts
import { prisma } from "@/lib/prisma";
import { AvailabilityFilter } from "@/schemas/regular-class-template.schema";
import { Prisma, Teacher, Student, DayOfWeek } from "@prisma/client";

type CompatibilityResult = {
  teachers: Awaited<ReturnType<typeof prisma.teacher.findMany>>;
  students: Awaited<ReturnType<typeof prisma.student.findMany>>;
  booths: Awaited<ReturnType<typeof prisma.booth.findMany>>;
  subjects: Awaited<ReturnType<typeof prisma.subject.findMany>>;
  subjectTypes: Awaited<ReturnType<typeof prisma.subjectType.findMany>>;
};

/**
 * Find compatible teachers, students, booths, subjects, and subject types
 * based on the given filter criteria
 */
export async function findCompatibility(
  filter: AvailabilityFilter
): Promise<CompatibilityResult> {
  const {
    dayOfWeek,
    startTime,
    endTime,
    subjectId,
    subjectTypeId,
    teacherId,
    studentId,
    boothId,
  } = filter;

  // 1) Convert string times to Date objects once
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);

  // 2) Build teacher query
  const teacherWhere: Prisma.TeacherWhereInput = {
    ...(teacherId ? { teacherId } : {}),
    TeacherShiftReference: {
      some: {
        dayOfWeek,
        startTime: { lte: start },
        endTime: { gte: end },
      },
    },
    NOT: {
      regularClassTemplates: {
        some: {
          dayOfWeek,
          startTime: { lt: end },
          endTime: { gt: start },
        },
      },
    },
  };

  // Add subject and subject type filters if provided
  if (subjectId || subjectTypeId) {
    const subjectCondition: Prisma.TeacherSubjectWhereInput = {};

    if (subjectId) {
      subjectCondition.subjectId = subjectId;
    }

    if (subjectTypeId) {
      subjectCondition.subjectTypeId = subjectTypeId;
    }

    teacherWhere.teacherSubjects = {
      some: subjectCondition,
    };
  }

  // 3) Build student query
  const studentWhere: Prisma.StudentWhereInput = {
    ...(studentId ? { studentId } : {}),
    StudentPreference: {
      some: {
        timeSlots: {
          some: {
            dayOfWeek,
            startTime: { lte: start },
            endTime: { gte: end },
          },
        },
      },
    },
    NOT: {
      templateStudentAssignments: {
        some: {
          regularClassTemplate: {
            dayOfWeek,
            startTime: { lt: end },
            endTime: { gt: start },
          },
        },
      },
    },
  };

  // Add subject and subject type filters for students if provided
  if (subjectId || subjectTypeId) {
    const subjectCondition: Prisma.StudentPreferenceSubjectWhereInput = {};

    if (subjectId) {
      subjectCondition.subjectId = subjectId;
    }

    if (subjectTypeId) {
      subjectCondition.subjectTypeId = subjectTypeId;
    }

    if (
      studentWhere.StudentPreference &&
      typeof studentWhere.StudentPreference === "object"
    ) {
      const someCondition = studentWhere.StudentPreference
        .some as Prisma.StudentPreferenceWhereInput;
      someCondition.subjects = {
        some: subjectCondition,
      };
    }
  }

  // Add teacher preference if provided
  if (teacherId) {
    if (
      studentWhere.StudentPreference &&
      typeof studentWhere.StudentPreference === "object"
    ) {
      const someCondition = studentWhere.StudentPreference
        .some as Prisma.StudentPreferenceWhereInput;
      someCondition.teachers = {
        some: { teacherId },
      };
    }
  }

  // 4) Build booth query
  const boothWhere: Prisma.BoothWhereInput = {
    status: true,
    ...(boothId ? { boothId } : {}),
    NOT: {
      regularClassTemplates: {
        some: {
          dayOfWeek,
          startTime: { lt: end },
          endTime: { gt: start },
        },
      },
    },
  };

  // 5) Execute all queries in parallel for better performance
  const [teachers, students, booths, subjects, subjectTypes] =
    await Promise.all([
      prisma.teacher.findMany({
        where: teacherWhere,
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
          evaluation: true,
          TeacherShiftReference: true,
        },
      }),
      prisma.student.findMany({
        where: studentWhere,
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
      prisma.booth.findMany({ where: boothWhere }),
      prisma.subject.findMany({
        where: subjectId ? { subjectId } : {},
        include: {
          subjectToSubjectTypes: {
            include: {
              subjectType: true,
            },
          },
        },
      }),
      prisma.subjectType.findMany({
        where: subjectTypeId ? { subjectTypeId } : {},
      }),
    ]);

  return { teachers, students, booths, subjects, subjectTypes };
}

/**
 * Validate subject-subject type combination
 */
export async function validateSubjectTypePair(
  subjectId: string,
  subjectTypeId: string
): Promise<boolean> {
  const validPair = await prisma.subjectToSubjectType.findFirst({
    where: {
      subjectId,
      subjectTypeId,
    },
  });

  return !!validPair;
}

/**
 * Calculate compatibility score between a teacher and student
 */
export function calculateTeacherCompatibilityScore({
  teacher,
  student,
  isPreferred,
  timeOverlap,
  subjectMatch,
}: {
  teacher: Teacher & { evaluation?: { score: number } | null };
  student: any;
  isPreferred: boolean;
  timeOverlap: number;
  subjectMatch: boolean;
}): number {
  let score = 50; // Base score

  // 1. Add points for direct preferences
  if (isPreferred) {
    score += 30;
  }

  // 2. Add points for subject match
  if (subjectMatch) {
    score += 20;
  }

  // 3. Add points for time overlap
  score += Math.min(Math.round(timeOverlap * 20), 20);

  // 4. Add points for teacher rating if available
  if (teacher.evaluation) {
    // Normalize the evaluation score to a 0-10 range
    // Assuming rating is 1-5, multiply by 2
    score += Math.round(teacher.evaluation.score * 2);
  }

  // Cap the score at 100
  return Math.min(score, 100);
}

/**
 * Calculate time overlap between teacher and student
 */
export function getTimeOverlap(teacher: any, student: any): number {
  // If no teacher shifts or student preferences, return 0
  if (!teacher.TeacherShiftReference || !student.StudentPreference) {
    return 0;
  }

  // Get all teacher shifts
  const teacherShifts = teacher.TeacherShiftReference;

  // Get all student time slots
  const studentTimeSlots = student.StudentPreference.flatMap(
    (pref: { timeSlots: any; }) => pref.timeSlots || []
  );

  // If either is empty, return 0
  if (teacherShifts.length === 0 || studentTimeSlots.length === 0) {
    return 0;
  }

  // Count overlaps by day
  let totalOverlapMinutes = 0;
  let totalAvailableMinutes = 0;

  // Group by day of week
  const teacherShiftsByDay = teacherShifts.reduce((acc: { [x: string]: any[]; }, shift: { dayOfWeek: string | number; }) => {
    if (!acc[shift.dayOfWeek]) {
      acc[shift.dayOfWeek] = [];
    }
    acc[shift.dayOfWeek].push(shift);
    return acc;
  }, {});

  const studentSlotsByDay = studentTimeSlots.reduce((acc: { [x: string]: any[]; }, slot: { dayOfWeek: string | number; }) => {
    if (!acc[slot.dayOfWeek]) {
      acc[slot.dayOfWeek] = [];
    }
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {});

  // Calculate overlap for each day
  Object.keys(teacherShiftsByDay).forEach((day) => {
    const teacherDayShifts = teacherShiftsByDay[day];
    const studentDaySlots = studentSlotsByDay[day] || [];

    teacherDayShifts.forEach((teacherShift: { startTime: { getHours: () => number; getMinutes: () => number; }; endTime: { getHours: () => number; getMinutes: () => number; }; }) => {
      // Convert to minutes for easier calculation
      const teacherStart =
        teacherShift.startTime.getHours() * 60 +
        teacherShift.startTime.getMinutes();
      const teacherEnd =
        teacherShift.endTime.getHours() * 60 +
        teacherShift.endTime.getMinutes();
      const teacherDuration = teacherEnd - teacherStart;

      totalAvailableMinutes += teacherDuration;

      studentDaySlots.forEach((studentSlot: { startTime: { getHours: () => number; getMinutes: () => number; }; endTime: { getHours: () => number; getMinutes: () => number; }; }) => {
        const studentStart =
          studentSlot.startTime.getHours() * 60 +
          studentSlot.startTime.getMinutes();
        const studentEnd =
          studentSlot.endTime.getHours() * 60 +
          studentSlot.endTime.getMinutes();

        // Calculate overlap
        const overlapStart = Math.max(teacherStart, studentStart);
        const overlapEnd = Math.min(teacherEnd, studentEnd);
        const overlapDuration = Math.max(0, overlapEnd - overlapStart);

        totalOverlapMinutes += overlapDuration;
      });
    });
  });

  // Return the ratio of overlap to total available time
  return totalAvailableMinutes > 0
    ? totalOverlapMinutes / totalAvailableMinutes
    : 0;
}

/**
 * Get grade-appropriate subjects for a student without preferences
 */
export async function getSubjectsWithFallback(
  gradeId: string | null | undefined
): Promise<string[]> {
  if (!gradeId) {
    // If no grade, return all subjects
    const allSubjects = await prisma.subject.findMany({
      select: { subjectId: true },
    });
    return allSubjects.map((s) => s.subjectId);
  }

  // Get the grade and student type
  const grade = await prisma.grade.findUnique({
    where: { gradeId },
    include: { studentType: true },
  });

  if (!grade) {
    // Fallback to all subjects
    const allSubjects = await prisma.subject.findMany({
      select: { subjectId: true },
    });
    return allSubjects.map((s) => s.subjectId);
  }

  // Find subjects with matching subject types appropriate for this grade/student type
  const subjectTypes = await prisma.subjectType.findMany({
    where: {
      // This is a placeholder for real logic; you would need to add appropriate
      // fields to your schema to implement true grade-based subject matching
    },
    select: { subjectTypeId: true },
  });

  const subjectTypeIds = subjectTypes.map((st) => st.subjectTypeId);

  // Find subjects that have these subject types
  const subjects = await prisma.subjectToSubjectType.findMany({
    where: {
      subjectTypeId: { in: subjectTypeIds },
    },
    select: { subjectId: true },
  });

  return subjects.map((s) => s.subjectId);
}

/**
 * Check for conflicts when creating or updating a template
 */
export async function checkTemplateConflicts({
  dayOfWeek,
  startTime,
  endTime,
  teacherId,
  boothId,
  studentIds,
  excludeTemplateId,
}: {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  teacherId: string;
  boothId: string;
  studentIds: string[];
  excludeTemplateId?: string;
}) {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);

  // Build the conflict exclusion condition
  const notCondition = excludeTemplateId
    ? { templateId: { not: excludeTemplateId } }
    : {};

  // Check for teacher conflicts
  const teacherConflicts = await prisma.regularClassTemplate.findMany({
    where: {
      ...notCondition,
      teacherId,
      dayOfWeek,
      OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
    },
    include: {
      teacher: true,
      templateStudentAssignments: {
        include: { student: true },
      },
    },
  });

  // Check for booth conflicts
  const boothConflicts = await prisma.regularClassTemplate.findMany({
    where: {
      ...notCondition,
      boothId,
      dayOfWeek,
      OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
    },
    include: {
      booth: true,
    },
  });

  // Check for student conflicts
  const studentConflicts = await prisma.templateStudentAssignment.findMany({
    where: {
      studentId: { in: studentIds },
      regularClassTemplate: {
        ...notCondition,
        dayOfWeek,
        OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
      },
    },
    include: {
      student: true,
      regularClassTemplate: true,
    },
  });

  // Check for holiday conflicts
  const holidays = await prisma.event.findMany({
    where: {
      OR: [
        // Current holidays that are recurring on this day
        { isRecurring: true },
        // Future scheduled holidays
        {
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      ],
    },
  });

  const hasHolidayConflict = holidays.length > 0;

  return {
    hasConflicts:
      teacherConflicts.length > 0 ||
      boothConflicts.length > 0 ||
      studentConflicts.length > 0 ||
      hasHolidayConflict,
    teacherConflicts,
    boothConflicts,
    studentConflicts,
    holidayConflicts: hasHolidayConflict ? holidays : [],
    warnings: [
      ...(teacherConflicts.length > 0 ? ["TEACHER_CONFLICT"] : []),
      ...(boothConflicts.length > 0 ? ["BOOTH_CONFLICT"] : []),
      ...(studentConflicts.length > 0 ? ["STUDENT_CONFLICT"] : []),
      ...(hasHolidayConflict ? ["HOLIDAY_CONFLICT"] : []),
    ],
  };
}

/**
 * Get all valid subject types for a given subject
 */
export async function getValidSubjectTypesForSubject(
  subjectId: string
): Promise<string[]> {
  const validPairs = await prisma.subjectToSubjectType.findMany({
    where: {
      subjectId,
    },
    include: {
      subjectType: true,
    },
  });

  return validPairs.map((pair) => pair.subjectTypeId);
}

/**
 * Get all valid subjects for a given subject type
 */
export async function getValidSubjectsForSubjectType(
  subjectTypeId: string
): Promise<string[]> {
  const validPairs = await prisma.subjectToSubjectType.findMany({
    where: {
      subjectTypeId,
    },
    include: {
      subject: true,
    },
  });

  return validPairs.map((pair) => pair.subjectId);
}
