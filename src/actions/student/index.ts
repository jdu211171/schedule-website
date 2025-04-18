"use server";

import { prisma } from "@/lib/prisma";
import { Student, StudentPreference } from "@prisma/client";
import { Grade } from "@prisma/client";
import { requireAuth } from "../auth-actions";

interface GetStudentsParams {
  page?: number;
  pageSize?: number;
}

export async function getStudents({
  page = 1,
  pageSize = 10,
}: GetStudentsParams = {}): Promise<(Student & { grade: Grade | null, preference: StudentPreference | null })[]> {
  await requireAuth();
  const skip = (page - 1) * pageSize;
  return prisma.student.findMany({
    skip,
    take: pageSize,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      grade: true,
      preference: true,
    },
  });
}
