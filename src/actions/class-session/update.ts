"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";
import { classSessionUpdateSchema } from "@/schemas/class-session.schema";

export async function updateClassSession(
  data: z.infer<typeof classSessionUpdateSchema>
) {
  await requireAuth();

  const parsed = classSessionUpdateSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid data provided: " + parsed.error.message);
  }

  const {
    classId,
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

  const updateData: any = {};
  if (date) updateData.date = date;
  if (teacherId) updateData.teacherId = teacherId;
  if (subjectId) updateData.subjectId = subjectId;
  if (boothId) updateData.boothId = boothId;
  if (classTypeId) updateData.classTypeId = classTypeId;
  if (notes) updateData.notes = notes;
  if (startTime && date) {
    updateData.startTime = new Date(
      `${date.toISOString().split("T")[0]}T${startTime}Z`
    );
  }
  if (endTime && date) {
    updateData.endTime = new Date(
      `${date.toISOString().split("T")[0]}T${endTime}Z`
    );
  }

  return prisma.$transaction(async (tx) => {
    const classSession = await tx.classSession.update({
      where: { classId },
      data: updateData,
    });

    // Optionally update student enrollment if studentId is provided
    if (studentId) {
      await tx.studentClassEnrollment.upsert({
        where: { classId_studentId: { classId, studentId } },
        update: { status: "enrolled" },
        create: { classId, studentId, status: "enrolled" },
      });
    }

    return classSession;
  });
}
