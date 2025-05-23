// src/schemas/staff.schema.ts
import { z } from "zod";

export const staffCreateSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100, "名前は100文字以内で入力してください"),
  username: z.string().min(3, "ユーザー名は3文字以上で入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
  email: z.string().email("有効なメールアドレス形式で入力してください"),
  branchIds: z.array(z.string()).optional().default([]),
});

export const staffUpdateSchema = staffCreateSchema.partial().extend({
  id: z.string(),
});

// Define a base schema for the common fields.
export const staffBaseSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100, "名前は100文字以内で入力してください"),
  username: z.string().min(3, "ユーザー名は3文字以上で入力してください"),
  // Password is not always required in the form (e.g., when updating without changing password)
  // It will be required by staffCreateSchema for actual creation.
  // For the form itself, it can be optional initially.
  password: z.string().optional(),
  email: z.string().email("有効なメールアドレス形式で入力してください"),
  branchIds: z.array(z.string()).optional().default([]),
});

// Extend the base schema with an optional "id" field for edit mode.
export const staffFormSchema = staffBaseSchema.extend({
  id: z.string().optional(),
});

// Use the unified type inferred from the schema.
export type StaffFormValues = z.infer<typeof staffFormSchema>;

export const staffFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
});

export type StaffCreate = z.infer<typeof staffCreateSchema>;
export type StaffUpdate = z.infer<typeof staffUpdateSchema>;
export type StaffFilter = z.infer<typeof staffFilterSchema>;
