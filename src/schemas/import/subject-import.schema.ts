import { z } from "zod";

export const subjectImportSchema = z.object({
  name: z
    .string()
    .min(1, "科目名は必須です")
    .max(100, "科目名は100文字以下で入力してください"),
  notes: z
    .string()
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional(),
});

export type SubjectImportData = z.infer<typeof subjectImportSchema>;

export const SUBJECT_CSV_HEADERS = ["name", "notes"] as const;

// Required headers that must be present in the CSV
export const REQUIRED_SUBJECT_CSV_HEADERS = ["name"] as const;
