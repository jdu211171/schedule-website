"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getBooths() {
    requireAuth();

    console.log("Fetching booths from the database");

    const booths = await prisma.booth.findMany({
        orderBy: {
            name: 'asc',
        },
    });
    return booths;
}
