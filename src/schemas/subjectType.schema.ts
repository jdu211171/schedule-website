import { z } from "zod";

export const subjectTypeCreateSchema = z.object({
    subjectTypeId: z.string().min(1, { message: "Subject Type ID is required" }),
    name: z.string().min(1, { message: "Name is required" }),
    notes: z.string().optional(),
});

export const subjectTypeUpdateSchema = subjectTypeCreateSchema.partial();

export type SubjectTypeCreateInput = z.infer<typeof subjectTypeCreateSchema>;
export type SubjectTypeUpdateInput = z.infer<typeof subjectTypeUpdateSchema>;
