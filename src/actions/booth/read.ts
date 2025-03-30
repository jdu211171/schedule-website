"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getBooth(id: string) {
    await requireAuth();

    const booth = await prisma.booth.findUnique({
        where: {
            boothId: id,
        },
    });

    if (!booth) {
        throw new Error("Booth not found");
    }

    return booth;
}
