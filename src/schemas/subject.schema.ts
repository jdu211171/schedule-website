import { z } from "zod";

export const subjectCreateSchema = z.object({
    name: z.string().min(1, { message: "名前は必須です" }),
    subjectTypeId: z.string().optional(),
    notes: z.string().optional(),
});

export const subjectUpdateSchema = subjectCreateSchema.partial().extend({
    subjectId: z.string().cuid({ message: "無効なIDです" }), // Required for updates
});

export const subjectSchema = z.object({
    subjectId: z.string(),
    name: z.string(),
    subjectTypeId: z.string().nullable(),
    notes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type SubjectCreateInput = z.infer<typeof subjectCreateSchema>;
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>;
export type Subject = z.infer<typeof subjectSchema>;