import { z } from "zod";

export const subjectCreateSchema = z.object({
    subjectId: z.string().min(1, { message: "Subject ID is required" }),
    name: z.string().min(1, { message: "Name is required" }),
    subjectTypeId: z.string().optional(),
    notes: z.string().optional(),
});

export const subjectUpdateSchema = subjectCreateSchema.partial();

export type SubjectCreateInput = z.infer<typeof subjectCreateSchema>;
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>;