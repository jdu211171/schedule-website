import { z } from "zod";

export const EvaluationSchema = z
  .object({
    evaluationId: z.string(), // default: cuid()
    teacherId: z.string(),
    studentId: z.string(),
    subjectId: z.string(),
    rating: z.number().int(),
    comments: z.string().max(255).optional(),
    teacher: z.lazy(() => TeacherSchema), // relation: Teacher
    student: z.lazy(() => StudentSchema), // relation: Student
    subject: z.lazy(() => SubjectSchema), // relation: Subject
    createdAt: z.date(), // default: now()
  })
  .strict();
