import { z } from "zod";

export const subjectTypeImportSchema = z.object({
  name: z
    .string()
    .min(1, "科目タイプ名は必須です")
    .max(100, "科目タイプ名は100文字以下で入力してください"),
  notes: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  order: z
    .string()
    .transform(val => val === "" ? 0 : parseInt(val, 10))
    .pipe(z.number().int().min(0, "順序は0以上の整数で入力してください"))
    .default("0"),
});

export type SubjectTypeImportData = z.infer<typeof subjectTypeImportSchema>;

export const SUBJECT_TYPE_CSV_HEADERS = ["name", "notes", "order"] as const;

// Required headers that must be present in the CSV
export const REQUIRED_SUBJECT_TYPE_CSV_HEADERS = [
  "name"
] as const;