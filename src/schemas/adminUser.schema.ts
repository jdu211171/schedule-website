import { z } from "zod";

// Base schema for common fields
export const adminUserBaseSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  username: z.string().min(3, "ユーザー名は3文字以上である必要があります"),
  password: z.string().optional(),
  branchIds: z.array(z.string()).min(1, "少なくとも1つの支店を選択してください"),
  isRestrictedAdmin: z.boolean().default(false),
});

// Form schema with optional id field for edit mode
export const adminUserFormSchema = adminUserBaseSchema.extend({
  id: z.string().optional(),
});

// Create schema where password is required
export const adminUserCreateSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  username: z.string().min(3, "ユーザー名は3文字以上である必要があります"),
  password: z.string().min(6, "パスワードは6文字以上である必要があります"),
  branchIds: z.array(z.string()).min(1, "少なくとも1つの支店を選択してください"),
  isRestrictedAdmin: z.boolean().default(false),
});

// Update schema with all fields optional except id
export const adminUserUpdateSchema = adminUserCreateSchema.partial().extend({
  id: z.string(),
});

export const adminUserFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  branchId: z.string().optional(),
  sortBy: z.enum(["name", "email", "order", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// For updating admin user order with permission constraints
export const adminUserOrderUpdateSchema = z.object({
  userIds: z.array(z.string()).min(1),
}).refine((data) => {
  // Additional client-side validation can be added here
  // The main permission validation is done server-side
  return data.userIds.length > 0;
}, {
  message: "少なくとも1つの管理者IDが必要です"
});

export type AdminUserFormInput = z.infer<typeof adminUserFormSchema>;
export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>;
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
export type AdminUserFilter = z.infer<typeof adminUserFilterSchema>;
export type AdminUserOrderUpdate = z.infer<typeof adminUserOrderUpdateSchema>;
