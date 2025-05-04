import { z } from "zod";

export const StudentPreferenceSchema = z
  .object({
    preferenceId: z.string(), // default: cuid()
    studentId: z.string(),
    // preferredDays: DayOfWeekEnum.array().optional(),
    // preferredTimeSlots: z.lazy(() => StudentPreferenceTimeSlotSchema).array(), // relation: StudentPreferenceTimeSlot[]
    // preferredTeachers: z.lazy(() => StudentPreferenceTeacherSchema).array(), // relation: StudentPreferenceTeacher[]
    // preferredSubjects: z.lazy(() => StudentPreferenceSubjectSchema).array(), // relation: StudentPreferenceSubject[]
    // student: z.lazy(() => StudentSchema), // relation: Student
  })
  .strict();
