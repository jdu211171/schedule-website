import { z } from "zod";

export const subjectTypeCreateSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    notes: z.string().optional(),
});

export const subjectTypeUpdateSchema = subjectTypeCreateSchema.partial().extend({
    subjectTypeId: z.string().cuid({ message: "Invalid ID" }), // Required for updates
})

export type SubjectTypeCreateInput = z.infer<typeof subjectTypeCreateSchema>;
export type SubjectTypeUpdateInput = z.infer<typeof subjectTypeUpdateSchema>;
