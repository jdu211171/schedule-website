import { z } from "zod";

export const classTypeImportSchema = z.object({
  name: z
    .string()
    .min(1, "授業タイプ名は必須です")
    .max(100, "授業タイプ名は100文字以下で入力してください"),
  notes: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  parentName: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  order: z
    .string()
    .transform(val => val === "" ? 0 : parseInt(val, 10))
    .pipe(z.number().int().min(0, "順序は0以上の整数で入力してください"))
    .default("0"),
  visibleInFilters: z
    .string()
    .optional()
    .transform(val => {
      if (val === undefined || val === null || val === "") return undefined;
      const t = String(val).trim().toLowerCase();
      if (["y", "yes", "true", "1", "on"].includes(t)) return true;
      if (["n", "no", "false", "0", "off"].includes(t)) return false;
      return undefined; // ignore invalid
    }),
});

export type ClassTypeImportData = z.infer<typeof classTypeImportSchema>;

export const CLASS_TYPE_CSV_HEADERS = ["name", "notes", "parentName", "order", "visibleInFilters"] as const;

// Required headers that must be present in the CSV
export const REQUIRED_CLASS_TYPE_CSV_HEADERS = [
  "name"
] as const;
