import { z } from "zod";

export const desiredTimeSchema = z.object({
  dayOfWeek: z.string({
    required_error: "曜日は必須です",
    invalid_type_error: "曜日は文字列である必要があります",
  }),
  startTime: z.string({
    required_error: "開始時間は必須です",
    invalid_type_error: "開始時間は文字列である必要があります",
  }), // Consider adding regex for time format e.g. .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "開始時間はHH:MM形式で入力してください" })
  endTime: z.string({
    required_error: "終了時間は必須です",
    invalid_type_error: "終了時間は文字列である必要があります",
  }), // Consider adding regex for time format e.g. .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "終了時間はHH:MM形式で入力してください" })
});

export type DesiredTimeInput = z.infer<typeof desiredTimeSchema>;
