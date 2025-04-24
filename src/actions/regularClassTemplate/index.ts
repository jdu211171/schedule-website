"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";
import {
  RegularClassTemplate,
  Booth,
  Subject,
  Teacher,
  Student,
  TemplateStudentAssignment,
} from "@prisma/client";

interface GetTemplatesParams {
  page?: number;
  pageSize?: number;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  dayOfWeek?: string;
}

type TemplateWithRelations = RegularClassTemplate & {
  booth: Booth | null;
  subject: Subject | null;
  teacher: Teacher | null;
  templateStudentAssignments: (TemplateStudentAssignment & {
    student: Student | null;
  })[];
};

export async function getRegularClassTemplates({
  page = 1,
  pageSize = 10,
  teacherId,
  studentId,
  subjectId,
  dayOfWeek,
}: GetTemplatesParams = {}): Promise<TemplateWithRelations[]> {
  await requireAuth();

  const skip = (page - 1) * pageSize;

  const orFilter = [];
  if (teacherId) {
    orFilter.push({ teacherId });
  }
  if (studentId) {
    orFilter.push({
      templateStudentAssignments: { some: { studentId } },
    });
  }

  return prisma.regularClassTemplate.findMany({
    skip,
    take: pageSize,
    orderBy: { createdAt: "desc" },
    where: {
      OR: orFilter.length ? orFilter : undefined,
      subjectId,
      dayOfWeek,
    },
    include: {
      booth: true,
      subject: true,
      teacher: true,
      templateStudentAssignments: {
        include: { student: true }, // ★ ここを追加
      },
    },
  });
}
