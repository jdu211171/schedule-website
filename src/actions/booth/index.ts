"use server";

import prisma from "@/lib/prisma";
import {requireAuth} from "../auth-actions";

export async function getBooths() {
    await requireAuth();

    return prisma.booth.findMany({
        orderBy: {
            name: 'asc',
        },
    });
}
