"use server";

import { regularClassTemplateUpdateSchema } from "@/schemas/regular-class-template.schema";
import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function updateRegularClassTemplate(data: unknown) {
  await requireAuth();

  const parsed = regularClassTemplateUpdateSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data provided");

  const { templateId, ...rest } = parsed.data;

  return prisma.regularClassTemplate.update({
    where: { templateId },
    data: rest,
    include: { booth: true, subject: true, teacher: true },
  });
}
