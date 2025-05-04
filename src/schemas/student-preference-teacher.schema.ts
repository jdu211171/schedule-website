import { z } from "zod";

export const StudentPreferenceTeacherSchema = z
  .object({
    preferenceTeacherId: z.string(), // default: cuid()
    preferenceId: z.string(),
    teacherId: z.string(),
    // preference: z.lazy(() => StudentPreferenceSchema), // relation: StudentPreference
    // teacher: z.lazy(() => TeacherSchema), // relation: Teacher
  })
  .strict();
