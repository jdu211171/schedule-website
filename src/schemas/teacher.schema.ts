import { z } from "zod";

export const TeacherSchema = z
  .object({
    teacherId: z.string(), // default: cuid()
    firstName: z.string().max(100),
    lastName: z.string().max(100),
    email: z.string().email().max(255),
    subjects: z.lazy(() => TeacherSubjectSchema).array(), // relation: TeacherSubject[]
    shiftReferences: z.lazy(() => TeacherShiftReferenceSchema).array(), // relation: TeacherShiftReference[]
    classSessions: z.lazy(() => ClassSessionSchema).array(), // relation: ClassSession[]
    evaluations: z.lazy(() => EvaluationSchema).array(), // relation: Evaluation[]
    notification: z.lazy(() => NotificationSchema).optional(), // relation: Notification
    createdAt: z.date(), // default: now()
    updatedAt: z.date(), // default: now()
  })
  .strict();
