"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";
import { classSessionCreateSchema } from "@/schemas/class-session.schema";

export async function createClassSession(
  data: z.infer<typeof classSessionCreateSchema>
) {
  await requireAuth();

  const parsed = classSessionCreateSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid data provided: " + parsed.error.message);
  }

  const {
    date,
    startTime,
    endTime,
    teacherId,
    subjectId,
    boothId,
    classTypeId,
    notes,
    studentId,
  } = parsed.data;

  // Convert time strings to DateTime by combining with date
  const startDateTime = new Date(
    `${date.toISOString().split("T")[0]}T${startTime}Z`
  );
  const endDateTime = new Date(
    `${date.toISOString().split("T")[0]}T${endTime}Z`
  );

  return prisma.$transaction(async (tx) => {
    // Create the ClassSession with templateId as null
    const classSession = await tx.classSession.create({
      data: {
        date,
        startTime: startDateTime,
        endTime: endDateTime,
        teacherId,
        subjectId,
        boothId,
        classTypeId,
        notes,
        // templateId is null for exceptional classes
      },
    });

    // Enroll the student
    await tx.studentClassEnrollment.create({
      data: {
        classId: classSession.classId,
        studentId,
        status: "enrolled",
      },
    });

    return classSession;
  });
}
