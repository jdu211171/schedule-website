"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getClassType(id: string) {
    await requireAuth();

    const classType = await prisma.classType.findUnique({
        where: {
            classTypeId: id,
        },
    });

    if (!classType) {
        throw new Error("ClassType not found");
    }

    return classType;
}
