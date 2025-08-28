// src/schemas/vacation.schema.ts
import { z } from "zod";

// Valid sort fields
export const VACATION_SORT_FIELDS = [
  "order",
  "name",
  "startDate",
  "endDate",
  "createdAt",
  "updatedAt",
] as const;
export type VacationSortField = (typeof VACATION_SORT_FIELDS)[number];

// Filters for querying vacations
export const vacationFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isRecurring: z.coerce.boolean().optional(),
  branchId: z.string().optional(),
  includeGlobal: z.coerce.boolean().optional(),
  sortBy: z.enum(VACATION_SORT_FIELDS).default("order"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const vacationCreateSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isRecurring: z.boolean().optional().default(false),
  notes: z.string().max(255).optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
  branchId: z.string().optional(), // Optional for admin, will be populated from context
});

export const vacationUpdateSchema = z.object({
  vacationId: z.string(),
  name: z.string().min(1, "名前は必須です").max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isRecurring: z.boolean().optional(),
  notes: z.string().max(255).optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
});

// For updating vacation order
export const vacationOrderUpdateSchema = z.object({
  vacationIds: z.array(z.string()).min(1),
});

export type VacationCreate = z.infer<typeof vacationCreateSchema>;
export type VacationUpdate = z.infer<typeof vacationUpdateSchema>;
export type VacationFilter = z.infer<typeof vacationFilterSchema>;
export type VacationOrderUpdate = z.infer<typeof vacationOrderUpdateSchema>;
