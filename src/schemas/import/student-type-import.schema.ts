import { z } from "zod";

export const studentTypeImportSchema = z.object({
  name: z
    .string()
    .min(1, "学生タイプ名は必須です")
    .max(100, "学生タイプ名は100文字以下で入力してください"),
  maxYears: z
    .string()
    .transform((val) => (val === "" ? 1 : parseInt(val, 10)))
    .pipe(
      z
        .number()
        .int()
        .min(1, "最大年数は1以上の整数で入力してください")
        .max(10, "最大年数は10以下で入力してください")
    )
    .default("1"),
  description: z
    .string()
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional(),
  order: z
    .string()
    .transform((val) => (val === "" ? 0 : parseInt(val, 10)))
    .pipe(z.number().int().min(0, "順序は0以上の整数で入力してください"))
    .default("0"),
});

export type StudentTypeImportData = z.infer<typeof studentTypeImportSchema>;

export const STUDENT_TYPE_CSV_HEADERS = [
  "name",
  "maxYears",
  "description",
  "order",
] as const;

// Required headers that must be present in the CSV
export const REQUIRED_STUDENT_TYPE_CSV_HEADERS = ["name"] as const;
