import { z } from "zod";

export const classTypeCreateSchema = z.object({
    name: z.string(),
    notes: z.string().optional(),
    classTypeId: z.string().optional(), // Allow auto-generation by Prisma
});

export const classTypeUpdateSchema = classTypeCreateSchema.partial().extend({
    classTypeId: z.string(), // Required for updates
});

export type ClassTypeCreateInput = z.infer<typeof classTypeCreateSchema>;
export type ClassTypeUpdateInput = z.infer<typeof classTypeUpdateSchema>;
