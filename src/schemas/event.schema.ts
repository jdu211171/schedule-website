// src/schemas/event.schema.ts
import { z } from "zod";

export const eventCreateSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isRecurring: z.boolean().optional().default(false),
  notes: z.string().max(255).optional().nullable(),
  branchId: z.string().optional(), // Optional for admin, will be populated from context
});

export const eventUpdateSchema = z.object({
  eventId: z.string(),
  name: z.string().min(1, "名前は必須です").max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isRecurring: z.boolean().optional(),
  notes: z.string().max(255).optional().nullable(),
});

export const eventFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isRecurring: z.coerce.boolean().optional(),
  branchId: z.string().optional(),
});

export type EventCreate = z.infer<typeof eventCreateSchema>;
export type EventUpdate = z.infer<typeof eventUpdateSchema>;
export type EventFilter = z.infer<typeof eventFilterSchema>;
