import { z } from "zod";

export const gradeCreateSchema = z.object({
    name: z.string(),
    gradeId: z.string().uuid({ message: "Invalid ID" }),
    gradeType: z.string().optional(),
    gradeNumber: z.string().optional(),
    notes: z.string().optional(),
});

export const gradeUpdateSchema = gradeCreateSchema.partial()

export type GradeCreateInput = z.infer<typeof gradeCreateSchema>;
export type GradeUpdateInput = z.infer<typeof gradeUpdateSchema>;