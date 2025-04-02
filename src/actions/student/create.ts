"use server";

import { studentCreateSchema, StudentCreateInput } from "@/schemas/student.schema";
import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function createStudent(data: StudentCreateInput) {
  await requireAuth();
  const parsed = studentCreateSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid data provided");
  }
  return prisma.student.create({
    data: parsed.data,
  });
}
