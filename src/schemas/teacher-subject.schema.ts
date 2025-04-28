import { z } from "zod";

export const TeacherSubjectSchema = z
  .object({
    teacherSubjectId: z.string(), // default: cuid()
    teacherId: z.string(),
    subjectId: z.string(),
    teacher: z.lazy(() => TeacherSchema), // relation: Teacher
    subject: z.lazy(() => SubjectSchema), // relation: Subject
  })
  .strict();
