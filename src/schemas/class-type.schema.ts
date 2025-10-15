// src/schemas/class-type.schema.ts
import { z } from "zod";

// Valid sort fields for class types
export const CLASS_TYPE_SORT_FIELDS = [
  "order",
  "name",
  "createdAt",
  "updatedAt",
] as const;
export type ClassTypeSortField = (typeof CLASS_TYPE_SORT_FIELDS)[number];

export const classTypeCreateSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  notes: z.string().max(255).optional().nullable(),
  parentId: z.string().optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
  color: z
    .string()
    .trim()
    .max(30)
    .optional()
    .nullable(),
});

export const classTypeUpdateSchema = z.object({
  classTypeId: z.string(),
  name: z.string().min(1, "名前は必須です").max(100).optional(),
  notes: z.string().max(255).optional().nullable(),
  parentId: z.string().optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
  color: z
    .string()
    .trim()
    .max(30)
    .optional()
    .nullable(),
});

export const classTypeFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
  parentId: z.string().optional().nullable(), // Filter by parent ID
  includeChildren: z.coerce.boolean().default(false), // Include children in response
  includeParent: z.coerce.boolean().default(false), // Include parent in response
  visibleOnly: z.coerce.boolean().default(true), // When true, only include class types visible in filters
  sortBy: z.enum(CLASS_TYPE_SORT_FIELDS).default("order"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// For updating class type order
export const classTypeOrderUpdateSchema = z.object({
  classTypeIds: z.array(z.string()).min(1),
});

export type ClassTypeCreate = z.infer<typeof classTypeCreateSchema>;
export type ClassTypeUpdate = z.infer<typeof classTypeUpdateSchema>;
export type ClassTypeFilter = z.infer<typeof classTypeFilterSchema>;
export type ClassTypeOrderUpdate = z.infer<typeof classTypeOrderUpdateSchema>;
