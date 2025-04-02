"use server";

import { BoothUpdateInput, boothUpdateSchema } from "@/schemas/booth.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateBooth(data: BoothUpdateInput) {
    await requireAuth();

    const parsed = boothUpdateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { boothId, ...updateData } = parsed.data;

    const updatedBooth = await prisma.booth.update({
        where: {
            boothId: boothId,
        },
        data: updateData,
    });

    return updatedBooth;
}
