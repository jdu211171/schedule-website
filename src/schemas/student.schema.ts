// src/schemas/student.schema.ts
import { z } from "zod";

export const studentBaseSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100, "名前は100文字以内で入力してください"),
  kanaName: z.string().max(100, "カナは100文字以内で入力してください").optional().nullable(),
  studentTypeId: z.string().optional().nullable(),
  gradeYear: z
    .number({ invalid_type_error: "学年は数字で入力してください" })
    .int("学年は整数で入力してください")
    .positive("学年は正の数で入力してください")
    .optional()
    .nullable(),
  lineId: z.string().max(50, "LINE IDは50文字以内で入力してください").optional().nullable(),
  notes: z.string().max(255, "備考は255文字以内で入力してください").optional().nullable(),
  // User account related fields
  username: z.string().min(3, "ユーザー名は3文字以上で入力してください"),
  password: z
    .string()
    .refine((value) => value.length === 0 || value.length >= 6, {
      message:
        "パスワードは6文字以上で入力してください。変更しない場合は空欄のままにしてください。",
    })
    .optional()
    .nullable(),
  email: z
    .string()
    .email("有効なメールアドレス形式で入力してください")
    .optional()
    .nullable(),
  branchIds: z.array(z.string(), { invalid_type_error: "支店を選択してください" }).optional(),
});

export const studentFormSchema = studentBaseSchema.extend({
  studentId: z.string().optional(),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

export const studentCreateSchema = studentBaseSchema.extend({
  password: z.string().min(6, "パスワードは6文字以上で入力してください"), // Password is required for creation
});

export const studentUpdateSchema = studentBaseSchema
  .partial() // Make all base fields optional for update
  .extend({ // Ensure studentId is required for update
    studentId: z.string({ required_error: "更新には生徒IDが必要です" }),
    // Password from studentBaseSchema.partial() is now correctly optional
    // and allows an empty string (for no change) or a min 6 char string if provided.
  });

export const studentFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
  studentTypeId: z.string().optional(),
  gradeYear: z.coerce.number().int().optional(),
});

export type StudentCreate = z.infer<typeof studentCreateSchema>;
export type StudentUpdate = z.infer<typeof studentUpdateSchema>;
export type StudentFilter = z.infer<typeof studentFilterSchema>;
