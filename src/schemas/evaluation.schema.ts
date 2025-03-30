import { z } from "zod";

export const evaluationCreateSchema = z.object({
    evaluationId: z.string().min(1, { message: "Evaluation ID is required" }),
    name: z.string().min(1, { message: "Name is required" }),
    score: z.number().int().optional(),
    notes: z.string().optional(),
});

export const evaluationUpdateSchema = evaluationCreateSchema.partial();

export type EvaluationCreateInput = z.infer<typeof evaluationCreateSchema>;
export type EvaluationUpdateInput = z.infer<typeof evaluationUpdateSchema>;