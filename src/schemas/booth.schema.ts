import { z } from "zod";

export const boothCreateSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    status: z.boolean().optional().default(true),
    notes: z.string().optional(),
});

export const boothUpdateSchema = boothCreateSchema.partial().extend({
    boothId: z.string().min(1, { message: "Booth ID is required" }),
});

export const boothSchema = z.object({
    boothId: z.string(),
    name: z.string(),
    status: z.boolean().nullable(),
    notes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type BoothCreateInput = z.infer<typeof boothCreateSchema>;
export type BoothUpdateInput = z.infer<typeof boothUpdateSchema>;
export type Booth = z.infer<typeof boothSchema>;