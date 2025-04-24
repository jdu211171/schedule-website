"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getClassSessions({
  startDate,
  endDate,
  teacherId,
  studentId,
}: {
  startDate?: Date;
  endDate?: Date;
  teacherId?: string;
  studentId?: string;
}) {
  await requireAuth();

  const where: {
    date?: { gte: Date; lte: Date };
    teacherId?: string;
    studentClassEnrollments?: { some: { studentId: string } };
  } = {};
  if (startDate && endDate) {
    where.date = { gte: startDate, lte: endDate };
  }
  if (teacherId) {
    where.teacherId = teacherId;
  }
  if (studentId) {
    where.studentClassEnrollments = { some: { studentId } };
  }

  return prisma.classSession.findMany({
    where,
    include: {
      teacher: true,
      subject: true,
      booth: true,
      classType: true,
      studentClassEnrollments: { include: { student: true } },
    },
    orderBy: { date: "asc" },
  });
}
