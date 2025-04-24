"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function deleteClassSession(classId: string) {
  await requireAuth();

  const classSession = await prisma.classSession.findUnique({
    where: { classId },
  });

  if (!classSession) {
    throw new Error("Class session not found");
  }

  await prisma.classSession.delete({
    where: { classId },
  });

  return { message: "Class session deleted successfully" };
}
