import {z} from "zod";

export const boothCreateSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    status: z.boolean().optional().default(true),
    notes: z.string().optional(),
});

export const boothUpdateSchema = boothCreateSchema.partial().extend({
    boothId: z.string().min(1, { message: "Booth ID is required" }),
});

export type BoothCreateInput = z.infer<typeof boothCreateSchema>;
export type BoothUpdateInput = z.infer<typeof boothUpdateSchema>;
