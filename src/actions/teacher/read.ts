"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getTeacher(teacherId: string) {
  await requireAuth();

  const teacher = await prisma.teacher.findUnique({
    where: { teacherId },
    include: {
      teacherRegularShifts: true,
      teacherSubjects: true,
    },
  });

  if (!teacher) {
    throw new Error("Teacher not found");
  }

  // Transform the teacher data to include preferences in a more usable format
  const desiredTimes = teacher.teacherRegularShifts.map((shift) => ({
    dayOfWeek: shift.dayOfWeek || "",
    startTime: shift.startTime
      ? shift.startTime.toISOString().substring(11, 16)
      : "",
    endTime: shift.endTime ? shift.endTime.toISOString().substring(11, 16) : "",
  }));

  const additionalNotes =
    teacher.teacherRegularShifts.length > 0
      ? teacher.teacherRegularShifts[0].notes || null
      : null;

  return {
    ...teacher,
    preference: {
      desiredTimes,
      additionalNotes,
    },
  };
}
