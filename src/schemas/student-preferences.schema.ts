import { z } from "zod"

export const studentPreferencesSchema = z.object({
    preferredSubjects: z.array(z.string()).optional(),
    preferredTeachers: z.array(z.string()).optional(),
    preferredWeekdays: z.array(z.string()).optional(),
    preferredHours: z.array(z.string()).optional(),
    additionalNotes: z.string().nullable(),
})

export type StudentPreferencesInput = z.infer<typeof studentPreferencesSchema>