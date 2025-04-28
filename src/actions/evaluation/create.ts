"use server";

import { evaluationCreateSchema, EvaluationCreateInput } from "@/schemas/evaluation.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function createEvaluation(data: EvaluationCreateInput) {
    await requireAuth();

    const parsed = evaluationCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    // Ensure 'score' is always present (default to 0 or another sensible value if missing)
    const evaluationData = {
        ...parsed.data,
        score: parsed.data.score ?? 0, // Replace 0 with your desired default if needed
    };

    await prisma.evaluation.create({
        data: evaluationData,
    });

    return evaluationData;
}
