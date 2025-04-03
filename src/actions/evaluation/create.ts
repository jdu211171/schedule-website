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

    await prisma.evaluation.create({
        data: parsed.data,
    });

    return parsed.data;
}