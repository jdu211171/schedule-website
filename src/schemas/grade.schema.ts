import { z } from "zod";

export const gradeCreateSchema = z.object({
    name: z.string().max(100, { message: "Name must be 100 characters or less" }),
    studentTypeId: z.string().nullable().optional(),
    gradeYear: z.number().int().nullable().optional(),
    notes: z.string().nullable().optional(),
});

export const gradeUpdateSchema = gradeCreateSchema.partial().extend({
    gradeId: z.string().cuid({ message: "Invalid ID" }), // Required for updates
})

export type GradeCreateInput = z.infer<typeof gradeCreateSchema>;
export type GradeUpdateInput = z.infer<typeof gradeUpdateSchema>;
