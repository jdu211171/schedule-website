import { z } from "zod";

const parseDate = (val: string): Date => {
  if (!val || val === "") {
    throw new Error("日付は必須です");
  }

  // Try different date formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
  ];

  let date: Date | null = null;

  if (formats[0].test(val) || formats[1].test(val)) {
    // YYYY-MM-DD or YYYY/MM/DD
    date = new Date(val);
  } else if (formats[2].test(val)) {
    // MM/DD/YYYY
    const [month, day, year] = val.split("/");
    date = new Date(`${year}-${month}-${day}`);
  } else if (formats[3].test(val)) {
    // MM-DD-YYYY
    const [month, day, year] = val.split("-");
    date = new Date(`${year}-${month}-${day}`);
  }

  if (!date || isNaN(date.getTime())) {
    throw new Error("有効な日付形式で入力してください (例: YYYY-MM-DD)");
  }

  return date;
};

export const holidayImportSchema = z
  .object({
    name: z
      .string()
      .min(1, "休日名は必須です")
      .max(100, "休日名は100文字以下で入力してください"),
    startDate: z.string().transform(parseDate),
    endDate: z.string().transform(parseDate),
    isRecurring: z
      .string()
      .transform((val) => {
        const lower = val.toLowerCase().trim();
        return (
          lower === "true" ||
          lower === "yes" ||
          lower === "1" ||
          lower === "はい" ||
          lower === "毎年"
        );
      })
      .default("false"),
    description: z
      .string()
      .transform((val) => (val === "" ? null : val))
      .nullable()
      .optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "終了日は開始日以降である必要があります",
    path: ["endDate"],
  });

export type HolidayImportData = z.infer<typeof holidayImportSchema>;

export const HOLIDAY_CSV_HEADERS = [
  "name",
  "startDate",
  "endDate",
  "isRecurring",
  "description",
] as const;

// Required headers that must be present in the CSV
export const REQUIRED_HOLIDAY_CSV_HEADERS = [
  "name",
  "startDate",
  "endDate",
] as const;
