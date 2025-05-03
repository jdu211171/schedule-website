import { z } from "zod";

export const TeacherShiftPreferencesSchema = z.object({
  dayOfWeek: z
    .enum([
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ])
    .optional(),
  desiredTimes: z
    .array(
      z.object({
        dayOfWeek: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      })
    )
    .default([]),
  additionalNotes: z.string().nullable().default(null),
});

export type TeacherShiftPreferencesInput = z.infer<
  typeof TeacherShiftPreferencesSchema
>;
