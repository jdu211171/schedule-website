"use server";

import { evaluationUpdateSchema, EvaluationUpdateInput } from "@/schemas/evaluation.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateEvaluation(data: EvaluationUpdateInput) {
    await requireAuth();

    const parsed = evaluationUpdateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { evaluationId } = parsed.data;
    
    if (!evaluationId) {
        throw new Error("Evaluation ID is required");
    }

    await prisma.evaluation.update({
        where: { evaluationId },
        data: parsed.data,
    });

    return parsed.data;
}
