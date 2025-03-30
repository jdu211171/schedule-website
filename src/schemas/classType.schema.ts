import { z } from "zod";

export const classTypeCreateSchema = z.object({
    name: z.string(),
    notes: z.string().optional(),
    classTypeId: z.string().uuid({ message: "Invalid ID" }),
});

export const classTypeUpdateSchema = classTypeCreateSchema.partial()

export type ClassTypeCreateInput = z.infer<typeof classTypeCreateSchema>;
export type ClassTypeUpdateInput = z.infer<typeof classTypeUpdateSchema>;
