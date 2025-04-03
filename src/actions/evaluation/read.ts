"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getEvaluation(id: string) {
    await requireAuth();

    const evaluation = await prisma.evaluation.findUnique({
        where: { evaluationId: id },
    });

    if (!evaluation) {
        throw new Error("Evaluation not found");
    }

    return evaluation;
}