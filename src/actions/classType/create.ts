"use server";

import { ClassTypeCreateInput, classTypeCreateSchema } from "@/schemas/classType.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function createClassType(data: ClassTypeCreateInput) {
    await requireAuth();

    const parsed = classTypeCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    await prisma.classType.create({
        data: parsed.data,
    });

    return parsed.data;
}