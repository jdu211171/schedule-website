import { z } from "zod";

export const StudentClassEnrollmentSchema = z
  .object({
    enrollmentId: z.string(), // default: cuid()
    classId: z.string(),
    studentId: z.string(),
    // classSession: z.lazy(() => ClassSessionSchema), // relation: ClassSession
    // student: z.lazy(() => StudentSchema), // relation: Student
    createdAt: z.date(), // default: now()
    updatedAt: z.date(), // default: now()
  })
  .strict();
