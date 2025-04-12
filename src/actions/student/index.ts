"use server";

import { prisma } from "@/lib/prisma";
import { Student } from "@prisma/client";
import { Grade } from "@prisma/client";
import { requireAuth } from "../auth-actions";

interface GetStudentsParams {
  page?: number;
  pageSize?: number;
}

export async function getStudents({
  page = 1,
  pageSize = 15,
}: GetStudentsParams = {}): Promise<(Student & { grade: Grade | null })[]> {
  await requireAuth();
  const skip = (page - 1) * pageSize;
  return prisma.student.findMany({
    skip,
    take: pageSize,
    include: {
      grade: true,
    },
  });
}
