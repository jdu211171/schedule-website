import {z} from "zod";

export const boothCreateSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    boothId: z.string().min(1, { message: "Booth ID is required" }),
    notes: z.string().optional(),
});

export const boothUpdateSchema = boothCreateSchema.partial().extend({
    id: z.string().uuid({ message: "Invalid ID" }),
    name: z.string().min(1, { message: "Name is required" }),
    boothId: z.string().min(1, { message: "Booth ID is required" }),
    notes: z.string().optional(),
});

export type BoothCreateInput = z.infer<typeof boothCreateSchema>;
export type BoothUpdateInput = z.infer<typeof boothUpdateSchema>;