// src/schemas/booth.schema.ts
import { z } from "zod";

export const boothCreateSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  status: z.boolean().optional().default(true),
  notes: z.string().max(255).optional().nullable(),
});

export const boothUpdateSchema = z.object({
  boothId: z.string(),
  name: z.string().min(1, "名前は必須です").max(100).optional(),
  status: z.boolean().optional(),
  notes: z.string().max(255).optional().nullable(),
});

export const boothFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
  status: z.coerce.boolean().optional(),
});

export type BoothCreate = z.infer<typeof boothCreateSchema>;
export type BoothUpdate = z.infer<typeof boothUpdateSchema>;
export type BoothFilter = z.infer<typeof boothFilterSchema>;
