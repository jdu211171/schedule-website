import { z } from "zod";

export const boothImportSchema = z.object({
  name: z
    .string()
    .min(1, "ブース名は必須です")
    .max(100, "ブース名は100文字以下で入力してください"),
  status: z
    .string()
    .transform((val) => {
      const lower = val.toLowerCase().trim();
      return (
        lower === "true" ||
        lower === "yes" ||
        lower === "1" ||
        lower === "はい" ||
        lower === "有効"
      );
    })
    .default("true"),
  branchName: z.string().min(1, "ブランチ名は必須です"),
  order: z
    .string()
    .transform((val) => (val === "" ? 0 : parseInt(val, 10)))
    .pipe(z.number().int().min(0, "順序は0以上の整数で入力してください"))
    .default("0"),
});

export type BoothImportData = z.infer<typeof boothImportSchema>;

export const BOOTH_CSV_HEADERS = [
  "name",
  "status",
  "branchName",
  "order",
] as const;

// Required headers that must be present in the CSV
export const REQUIRED_BOOTH_CSV_HEADERS = ["name", "branchName"] as const;
