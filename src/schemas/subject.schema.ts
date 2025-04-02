import { z } from "zod";

export const subjectCreateSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    subjectTypeId: z.string().optional(),
    notes: z.string().optional(),
});

export const subjectUpdateSchema = subjectCreateSchema.partial().extend({
    subjectId: z.string().cuid({ message: "Invalid ID" }), // Required for updates
})

export type SubjectCreateInput = z.infer<typeof subjectCreateSchema>;
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>;