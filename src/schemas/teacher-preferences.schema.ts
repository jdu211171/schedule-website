import { z } from "zod";

export const TeacherShiftPreferencesSchema = z.object({
  dayOfWeek: z
    .enum(
      [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ],
      {
        invalid_type_error: "曜日は文字列である必要があります",
        message: "無効な曜日です",
      }
    )
    .optional(),
  desiredTimes: z
    .array(
      z.object({
        dayOfWeek: z.string({
          required_error: "曜日は必須です",
          invalid_type_error: "曜日は文字列である必要があります",
        }),
        startTime: z.string({
          required_error: "開始時間は必須です",
          invalid_type_error: "開始時間は文字列である必要があります",
        }), // Consider adding regex for time format if needed
        endTime: z.string({
          required_error: "終了時間は必須です",
          invalid_type_error: "終了時間は文字列である必要があります",
        }), // Consider adding regex for time format if needed
      }),
      {
        invalid_type_error: "希望時間はオブジェクトの配列である必要があります",
      }
    )
    .default([]),
  additionalNotes: z
    .string({
      invalid_type_error: "追加の備考は文字列である必要があります",
    })
    .nullable()
    .default(null),
});

export type TeacherShiftPreferencesInput = z.infer<
  typeof TeacherShiftPreferencesSchema
>;
