"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function deleteBooth(id: string) {
    await requireAuth();

    const booth = await prisma.booth.findUnique({
        where: {
            boothId: id,
        },
    });


    if (!booth) {
        throw new Error("Booth not found");
    }

    await prisma.booth.delete({
        where: {
            boothId: id,
        },
    });

    return { message: "Booth deleted successfully" };
}