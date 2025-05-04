import { z } from "zod";

export const StudentPreferenceSubjectSchema = z
  .object({
    preferenceSubjectId: z.string(), // default: cuid()
    preferenceId: z.string(),
    subjectId: z.string(),
    // preference: z.lazy(() => StudentPreferenceSchema), // relation: StudentPreference
    // subject: z.lazy(() => SubjectSchema), // relation: Subject
  })
  .strict();
