"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getStudent(studentId: string) {
  await requireAuth();
  const student = await prisma.student.findUnique({
    where: { studentId },
    include: { studentRegularPreferences: true },
  });
  if (!student) throw new Error("Student not found");

  return {
    ...student,
    preference:
      student.studentRegularPreferences.length > 0
        ? {
            preferredSubjects:
              student.studentRegularPreferences[0].preferredSubjects || [],
            preferredTeachers:
              student.studentRegularPreferences[0].preferredTeachers || [],
            desiredTimes:
              student.studentRegularPreferences[0].preferredWeekdaysTimes || [],
            additionalNotes: student.studentRegularPreferences[0].notes || null,
          }
        : null,
  };
}
