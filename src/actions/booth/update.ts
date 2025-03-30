"use server";

import { BoothCreateInput, boothCreateSchema } from "@/schemas/booth.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateBooth(data: BoothCreateInput) {
    requireAuth();

    const parsed = boothCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    await prisma.booth.create({
        data: parsed.data,
    });

    return parsed.data;
}