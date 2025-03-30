"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function deleteEvaluation(id: string) {
    await requireAuth();

    const item = await prisma.evaluation.findUnique({
        where: { evaluationId: id },
    });

    if (!item) {
        throw new Error("Evaluation not found");
    }

    await prisma.evaluation.delete({
        where: { evaluationId: id },
    });

    return { message: "Evaluation deleted successfully" };
}