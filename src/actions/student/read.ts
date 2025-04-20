"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getStudent(studentId: string) {
  await requireAuth();
  const student = await prisma.student.findUnique({
    where: { studentId },
    include: { preference: true }
  });
  if (!student) {
    throw new Error("Student not found");
  }
  return student;
}