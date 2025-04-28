import { z } from "zod";

export const dayOfWeekEnum = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

export const desiredTimeSchema = z.object({
  dayOfWeek: dayOfWeekEnum,
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "時間は HH:MM 形式で入力してください",
  }),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "時間は HH:MM 形式で入力してください",
  }),
});

export const teacherShiftPreferencesSchema = z.object({
  desiredTimes: z.array(desiredTimeSchema).default([]),
  additionalNotes: z.string().nullable().default(null),
});

export type TeacherShiftPreferencesInput = z.infer<
  typeof teacherShiftPreferencesSchema
>;
