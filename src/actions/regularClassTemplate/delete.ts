"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function deleteRegularClassTemplate(id: string) {
  await requireAuth();

  const template = await prisma.regularClassTemplate.findUnique({
    where: { templateId: id },
  });
  if (!template) throw new Error("Template not found");

  await prisma.regularClassTemplate.delete({ where: { templateId: id } });
  return { message: "Template deleted successfully" };
}
