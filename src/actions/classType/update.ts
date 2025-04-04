"use server";

import { ClassTypeUpdateInput, classTypeUpdateSchema } from "@/schemas/classType.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateClassType(data: ClassTypeUpdateInput) {
    await requireAuth();

    const parsed = classTypeUpdateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { classTypeId, ...updateData } = parsed.data;

    const classType = await prisma.classType.findUnique({
        where: {
            classTypeId,
        },
    });

    if (!classType) {
        throw new Error("ClassType not found");
    }

    const result = await prisma.classType.update({
        where: {
            classTypeId,
        },
        data: updateData,
    });

    return result;
}
