"use server";

import { z } from "zod";
import { regularClassTemplateCreateSchema } from "@/schemas/regular-class-template.schema";
import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function createRegularClassTemplate(data: unknown) {
  await requireAuth();

  const singleParse = regularClassTemplateCreateSchema.safeParse(data);
  if (singleParse.success) {
    return prisma.regularClassTemplate.create({
      data: singleParse.data,
      include: { booth: true, subject: true, teacher: true },
    });
  }

  const arraySchema = z.array(regularClassTemplateCreateSchema);
  const arrayParse = arraySchema.safeParse(data);
  if (arrayParse.success) {
    const created = await Promise.all(
      arrayParse.data.map((item) =>
        prisma.regularClassTemplate.create({
          data: item,
          include: { booth: true, subject: true, teacher: true },
        })
      )
    );
    return created;
  }

  throw new Error("Invalid data provided");
}
