"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function deleteClassType(id: string) {
    await requireAuth();

    const classType = await prisma.classType.findUnique({
        where: {
            classTypeId: id,
        },
    });


    if (!classType) {
        throw new Error("ClassType not found");
    }

    await prisma.classType.delete({
        where: {
            classTypeId: id,
        },
    });

    return { message: "ClassType deleted successfully" };
}