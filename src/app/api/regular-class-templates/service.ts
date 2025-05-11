// src/app/api/regular-class-templates/service.ts
import { prisma } from "@/lib/prisma";
import { AvailabilityFilter } from "@/schemas/regular-class-template.schema";
import { Prisma } from "@prisma/client";

type CompatibilityResult = {
  teachers: Awaited<ReturnType<typeof prisma.teacher.findMany>>;
  students: Awaited<ReturnType<typeof prisma.student.findMany>>;
  booths: Awaited<ReturnType<typeof prisma.booth.findMany>>;
  subjects: Awaited<ReturnType<typeof prisma.subject.findMany>>;
  subjectTypes: Awaited<ReturnType<typeof prisma.subjectType.findMany>>;
};

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

  // 1) 文字列→Date 変換を一度だけ
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);

  // 2) compatibleTeachers
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

  // 3) compatibleStudents
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

  // 4) boothWhere
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

  // 5) 並列実行
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

// Helper function to verify subject-subject type combination validity
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

// Helper function to find all valid subject types for a given subject
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

// Helper function to find all valid subjects for a given subject type
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
