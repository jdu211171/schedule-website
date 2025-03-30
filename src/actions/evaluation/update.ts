"use server";

import { evaluationCreateSchema, EvaluationCreateInput } from "@/schemas/evaluation.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateEvaluation(data: EvaluationCreateInput) {
    await requireAuth();

    const parsed = evaluationCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { evaluationId } = parsed.data;

    await prisma.evaluation.update({
        where: { evaluationId },
        data: parsed.data,
    });

    return parsed.data;
}