import { z } from "zod";

export const classTypeCreateSchema = z.object({
    name: z.string(),
    notes: z.string().optional(),
});

export const classTypeUpdateSchema = classTypeCreateSchema.partial().extend({
    classTypeId: z.string(), // Required for updates
});

export const classTypeSchema = z.object({
    classTypeId: z.string(),
    name: z.string(),
    notes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type ClassTypeCreateInput = z.infer<typeof classTypeCreateSchema>;
export type ClassTypeUpdateInput = z.infer<typeof classTypeUpdateSchema>;
export type ClassType = z.infer<typeof classTypeSchema>;