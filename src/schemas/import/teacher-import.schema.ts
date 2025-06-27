import { z } from "zod";

export const teacherImportSchema = z.object({
  username: z
    .string()
    .min(3, "ユーザー名は3文字以上で入力してください")
    .max(50, "ユーザー名は50文字以下で入力してください")
    .regex(/^[a-zA-Z0-9_-]+$/, "ユーザー名は英数字、ハイフン、アンダースコアのみ使用できます"),
  email: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .max(100, "メールアドレスは100文字以下で入力してください"),
  password: z
    .string()
    .min(6, "パスワードは6文字以上で入力してください")
    .max(100, "パスワードは100文字以下で入力してください"),
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(100, "名前は100文字以下で入力してください"),
  kanaName: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  lineId: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  branches: z
    .string()
    .transform(val => val === "" ? [] : val.split(";").map(name => name.trim()))
    .pipe(z.array(z.string().min(1)))
    .optional()
    .default(""),
  notes: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  // Personal information
  birthDate: z
    .string()
    .transform(val => val === "" ? null : val)
    .pipe(z.coerce.date().nullable().optional())
    .optional(),
  phoneNumber: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional()
    .refine(val => !val || val.length <= 50, {
      message: "携帯番号は50文字以下で入力してください"
    }),
  phoneNotes: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional()
    .refine(val => !val || val.length <= 255, {
      message: "電話番号備考は255文字以下で入力してください"
    }),
});

export type TeacherImportData = z.infer<typeof teacherImportSchema>;

// Schema for update operations - all fields except username are optional
export const teacherUpdateImportSchema = z.object({
  username: z
    .string()
    .min(3, "ユーザー名は3文字以上で入力してください")
    .max(50, "ユーザー名は50文字以下で入力してください")
    .regex(/^[a-zA-Z0-9_-]+$/, "ユーザー名は英数字、ハイフン、アンダースコアのみ使用できます"),
  email: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional()
    .refine(val => !val || z.string().email().safeParse(val).success, {
      message: "有効なメールアドレスを入力してください"
    })
    .refine(val => !val || val.length <= 100, {
      message: "メールアドレスは100文字以下で入力してください"
    }),
  password: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional()
    .refine(val => !val || val.length >= 6, {
      message: "パスワードは6文字以上で入力してください"
    })
    .refine(val => !val || val.length <= 100, {
      message: "パスワードは100文字以下で入力してください"
    }),
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(100, "名前は100文字以下で入力してください")
    .optional(),
  kanaName: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  lineId: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  branches: z
    .string()
    .transform(val => val === "" ? [] : val.split(";").map(name => name.trim()))
    .pipe(z.array(z.string().min(1)))
    .optional()
    .default(""),
  notes: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  // Personal information
  birthDate: z
    .string()
    .transform(val => val === "" ? null : val)
    .pipe(z.coerce.date().nullable().optional())
    .optional(),
  phoneNumber: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional()
    .refine(val => !val || val.length <= 50, {
      message: "携帯番号は50文字以下で入力してください"
    }),
  phoneNotes: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional()
    .refine(val => !val || val.length <= 255, {
      message: "電話番号備考は255文字以下で入力してください"
    }),
});

export type TeacherUpdateImportData = z.infer<typeof teacherUpdateImportSchema>;

// This is now generated from column rules
export const TEACHER_CSV_HEADERS = [
  "名前",
  "カナ",
  "ステータス",
  "生年月日",
  "ユーザー名",
  "メールアドレス",
  "パスワード",
  "メッセージ連携",
  "携帯番号",
  "電話番号備考",
  "校舎",
  "選択科目",
  "備考"
] as const;

// Required headers that must be present in the CSV
export const REQUIRED_TEACHER_CSV_HEADERS = [
  "username",
  "name",
  "email"
] as const;