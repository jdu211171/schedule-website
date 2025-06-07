// src/schemas/student-type.schema.ts
import { z } from "zod";

// Valid sort fields
export const STUDENT_TYPE_SORT_FIELDS = [
  "order",
  "name",
  "createdAt",
  "updatedAt",
] as const;
export type StudentTypeSortField = (typeof STUDENT_TYPE_SORT_FIELDS)[number];

// Schema for creating a new student type
export const studentTypeCreateSchema = z.object({
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(100, "名前は100文字以内で入力してください"),
  maxYears: z.number().int().positive().optional(),
  description: z
    .string()
    .max(255, "説明は255文字以内で入力してください")
    .optional(),
  order: z.number().int().min(1).optional().nullable(),
});

// Schema for updating a student type
export const studentTypeUpdateSchema = z.object({
  studentTypeId: z.string(),
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(100, "名前は100文字以内で入力してください")
    .optional(),
  maxYears: z.number().int().positive().nullable().optional(),
  description: z
    .string()
    .max(255, "説明は255文字以内で入力してください")
    .nullable()
    .optional(),
  order: z.number().int().min(1).optional().nullable(),
});

// Schema for filtering student types
export const studentTypeFilterSchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, "ページは数値でなければなりません")
    .transform(Number)
    .default("1"),
  limit: z
    .string()
    .regex(/^\d+$/, "リミットは数値でなければなりません")
    .transform(Number)
    .default("10"),
  name: z.string().optional(),
  sortBy: z.enum(STUDENT_TYPE_SORT_FIELDS).default("order"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// For updating student type order
export const studentTypeOrderUpdateSchema = z.object({
  studentTypeIds: z.array(z.string()).min(1),
});

export type StudentTypeCreate = z.infer<typeof studentTypeCreateSchema>;
export type StudentTypeUpdate = z.infer<typeof studentTypeUpdateSchema>;
export type StudentTypeFilter = z.infer<typeof studentTypeFilterSchema>;
export type StudentTypeOrderUpdate = z.infer<
  typeof studentTypeOrderUpdateSchema
>;
