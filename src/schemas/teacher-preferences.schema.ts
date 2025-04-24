import { z } from "zod"
import { desiredTimeSchema } from "./desiredTime.schema"

export const teacherPreferencesSchema = z.object({
  preferredSubjects: z.array(z.string()).default([]),
  desiredTimes: z.array(desiredTimeSchema).default([]),
  notes: z.string().nullable().optional(),
})

export type TeacherPreferencesInput = z.infer<typeof teacherPreferencesSchema>