// src/app/api/regular-class-templates/service.ts
import { prisma } from "@/lib/prisma";
import {
  AvailabilityFilter,
} from "@/schemas/regular-class-template.schema";
import { Prisma } from "@prisma/client";

type CompatibilityResult = {
  teachers: Awaited<ReturnType<typeof prisma.teacher.findMany>>;
  students: Awaited<ReturnType<typeof prisma.student.findMany>>;
  booths: Awaited<ReturnType<typeof prisma.booth.findMany>>;
  subjects: Awaited<ReturnType<typeof prisma.subject.findMany>>;
};

export async function findCompatibility(
  filter: AvailabilityFilter
): Promise<CompatibilityResult> {
  const {
    dayOfWeek,
    startTime,
    endTime,
    subjectId,
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
    teacherSubjects: subjectId ? { some: { subjectId } } : undefined,
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

  // 3) compatibleStudents
  const studentWhere: Prisma.StudentWhereInput = {
    ...(studentId ? { studentId } : {}),
    StudentPreference: {
      some: {
        subjects: subjectId ? { some: { subjectId } } : undefined,
        teachers: teacherId ? { some: { teacherId } } : undefined,
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
  const [teachers, students, booths, subjects] = await Promise.all([
    prisma.teacher.findMany({
      where: teacherWhere,
    }),
    prisma.student.findMany({
      where: studentWhere,
    }),
    prisma.booth.findMany({ where: boothWhere }),
    prisma.subject.findMany({
      where: subjectId ? { subjectId } : {},
      include: { subjectType: true },
    }),
  ]);

  return { teachers, students, booths, subjects };
}
