import { z } from "zod";
import { desiredTimeSchema } from "./desiredTime.schema";

export const teacherShiftPreferencesSchema = z.object({
  desiredTimes: z.array(desiredTimeSchema).default([]),
  additionalNotes: z.string().nullable().default(null),
});

export type TeacherShiftPreferencesInput = z.infer<
  typeof teacherShiftPreferencesSchema
>;
