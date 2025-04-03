import { z } from "zod";

export const gradeCreateSchema = z.object({
    name: z.string().max(100, { message: "Name must be 100 characters or less" }),
    studentTypeId: z.string().nullable().optional(),
    gradeYear: z.number().int().nullable().optional(),
    notes: z.string().nullable().optional(),
});

export const gradeUpdateSchema = gradeCreateSchema.partial().extend({
    gradeId: z.string().cuid({ message: "Invalid ID" }), // Required for updates
});

export const gradeSchema = z.object({
    gradeId: z.string(),
    name: z.string(),
    studentTypeId: z.string().nullable(),
    gradeYear: z.number().int().nullable(),
    notes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type GradeCreateInput = z.infer<typeof gradeCreateSchema>;
export type GradeUpdateInput = z.infer<typeof gradeUpdateSchema>;
export type Grade = z.infer<typeof gradeSchema>;