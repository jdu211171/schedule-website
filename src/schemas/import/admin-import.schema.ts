import { z } from "zod";

export const adminImportSchema = z.object({
  username: z
    .string()
    .min(3, "ユーザー名は3文字以上で入力してください")
    .max(50, "ユーザー名は50文字以下で入力してください"),
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
  isRestrictedAdmin: z
    .string()
    .transform((val) => {
      const lower = val.toLowerCase().trim();
      return (
        lower === "true" || lower === "yes" || lower === "1" || lower === "はい"
      );
    })
    .default("false"),
  branchNames: z
    .string()
    .transform((val) =>
      val === "" ? [] : val.split(",").map((name) => name.trim())
    )
    .pipe(z.array(z.string().min(1)))
    .optional()
    .default(""),
});

export type AdminImportData = z.infer<typeof adminImportSchema>;

export const ADMIN_CSV_HEADERS = [
  "username",
  "email",
  "password",
  "name",
  "isRestrictedAdmin",
  "branchNames",
] as const;

// Required headers that must be present in the CSV
export const REQUIRED_ADMIN_CSV_HEADERS = [
  "username",
  "email",
  "password",
  "name",
] as const;
