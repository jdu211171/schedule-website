"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getRegularClassTemplate(templateId: string) {
  await requireAuth();

  const template = await prisma.regularClassTemplate.findUnique({
    where: { templateId },
    include: { booth: true, subject: true, teacher: true },
  });
  if (!template) throw new Error("Template not found");
  return template;
}
