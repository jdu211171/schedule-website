// src/schemas/teacher.schema.ts
import { z } from "zod";

// Subject preference schema for teacher registration
export const subjectPreferenceSchema = z.object({
  subjectId: z.string().min(1, "科目を選択してください"),
  subjectTypeIds: z
    .array(z.string())
    .min(1, "少なくとも1つの科目タイプを選択してください"),
});

// User status enum
export const userStatusEnum = z.enum([
  "ACTIVE",
  "SICK",
  "TEMPORARILY_LEFT",
  "PERMANENTLY_LEFT",
]);

export const userStatusLabels = {
  ACTIVE: "在籍",
  SICK: "病欠",
  TEMPORARILY_LEFT: "一時退会",
  PERMANENTLY_LEFT: "退会",
} as const;

// 共通フィールドのベーススキーマ
const teacherBaseSchema = z.object({
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(100, "名前は100文字以内で入力してください"),
  kanaName: z
    .string()
    .max(100, "カナは100文字以内で入力してください")
    .optional()
    .nullable(),
  email: z
    .string()
    .email("有効なメールアドレス形式で入力してください")
    .optional()
    .nullable(),
  lineId: z
    .string()
    .max(50, "LINE IDは50文字以内で入力してください")
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(255, "備考は255文字以内で入力してください")
    .optional()
    .nullable(),
  status: userStatusEnum.optional().default("ACTIVE"),
  username: z.string().min(3, "ユーザー名は3文字以上で入力してください"),
  // パスワードはフォーム上は任意、作成時は必須
  password: z
    .string()
    .refine((value) => value.length === 0 || value.length >= 6, {
      message:
        "パスワードは6文字以上で入力してください。変更しない場合は空欄のままにしてください。",
    })
    .optional()
    .nullable(),
  branchIds: z
    .array(z.string(), { invalid_type_error: "支店を選択してください" })
    .optional(),
  // Subject preferences
  subjectPreferences: z.array(subjectPreferenceSchema).optional().default([]),
});

// フォーム用の統一スキーマ（teacherIdは任意）
export const teacherFormSchema = teacherBaseSchema.extend({
  teacherId: z.string().optional(),
});

export type TeacherFormValues = z.infer<typeof teacherFormSchema>;

// 作成用スキーマ（パスワード必須）
export const teacherCreateSchema = teacherBaseSchema.extend({
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
});

// 更新用スキーマ（teacherId必須、他は任意）
export const teacherUpdateSchema = teacherBaseSchema.partial().extend({
  teacherId: z.string({ required_error: "更新には教師IDが必要です" }),
});

export const teacherFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
  status: userStatusEnum.optional(),
});

export type TeacherCreate = z.infer<typeof teacherCreateSchema>;
export type TeacherUpdate = z.infer<typeof teacherUpdateSchema>;
export type TeacherFilter = z.infer<typeof teacherFilterSchema>;
