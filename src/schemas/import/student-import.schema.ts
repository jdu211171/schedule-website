import { z } from "zod";

export const studentImportSchema = z.object({
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
    .min(8, "パスワードは8文字以上で入力してください")
    .max(100, "パスワードは100文字以下で入力してください"),
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(100, "名前は100文字以下で入力してください"),
  studentTypeName: z
    .string()
    .min(1, "生徒タイプは必須です"),
  kanaName: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  gradeYear: z
    .string()
    .transform(val => val === "" ? 1 : parseInt(val, 10))
    .pipe(z.number().int().min(1, "学年は1以上で入力してください"))
    .default("1"),
  lineId: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  subjects: z
    .string()
    .transform(val => val === "" ? [] : val.split(",").map(name => name.trim()))
    .pipe(z.array(z.string().min(1)))
    .optional()
    .default(""),
  notes: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
});

export type StudentImportData = z.infer<typeof studentImportSchema>;

export const STUDENT_CSV_HEADERS = [
  "username", 
  "email", 
  "password", 
  "name", 
  "kanaName",
  "studentTypeName", 
  "gradeYear", 
  "lineId",
  "notes",
  "subjects"
] as const;

// Required headers that must be present in the CSV
export const REQUIRED_STUDENT_CSV_HEADERS = [
  "username",
  "email", 
  "password",
  "name",
  "studentTypeName"
] as const;