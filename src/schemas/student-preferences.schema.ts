import { z } from "zod"

export const studentPreferencesSchema = z.object({
    preferredSubjects: z.array(z.string()).default([]),
    preferredTeachers: z.array(z.string()).default([]),
    preferredWeekdays: z.array(z.string()).default([]),
    preferredHours: z.array(z.string()).default([]),
    additionalNotes: z.string().nullable().optional(),
})

export type StudentPreferencesInput = z.infer<typeof studentPreferencesSchema>