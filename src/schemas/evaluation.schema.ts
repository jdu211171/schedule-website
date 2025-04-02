import { z } from "zod";

export const evaluationCreateSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    score: z.number().int().optional(),
    notes: z.string().optional(),
});

export const evaluationUpdateSchema = evaluationCreateSchema.partial().extend({
    evaluationId: z.string().cuid({ message: "Invalid ID" }), // Required for updates
})

export type EvaluationCreateInput = z.infer<typeof evaluationCreateSchema>;
export type EvaluationUpdateInput = z.infer<typeof evaluationUpdateSchema>;