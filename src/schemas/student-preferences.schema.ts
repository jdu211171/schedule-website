import { z } from "zod";
import { desiredTimeSchema } from "./desiredTime.schema";

export const studentPreferencesSchema = z.object({
  preferredSubjects: z.array(z.string()).default([]),
  preferredTeachers: z.array(z.string()).default([]),
  desiredTimes: z.array(desiredTimeSchema).default([]),
  additionalNotes: z.string().nullable().optional(),
});

export type StudentPreferencesInput = z.infer<typeof studentPreferencesSchema>;
