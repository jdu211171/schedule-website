import { z } from "zod";

export const StudentPreferenceTimeSlotSchema = z
  .object({
    timeSlotId: z.string(), // default: cuid()
    preferenceId: z.string(),
    startTime: z.date(),
    endTime: z.date(),
    // preference: z.lazy(() => StudentPreferenceSchema), // relation: StudentPreference
  })
  .strict();
