import { z } from "zod";

export const StudentSchema = z
  .object({
    studentId: z.string(), // default: cuid()
    firstName: z.string().max(100),
    lastName: z.string().max(100),
    schoolType: SchoolTypeEnum,
    examSchoolType: examSchoolTypeEnum.optional(),
    gradeId: z.string().max(50),
    notes: z.string().max(255).optional(),
    classEnrollments: z.lazy(() => StudentClassEnrollmentSchema).array(), // relation: StudentClassEnrollment[]
    preferences: z.lazy(() => StudentPreferenceSchema).array(), // relation: StudentPreference[]
    evaluations: z.lazy(() => EvaluationSchema).array(), // relation: Evaluation[]
    createdAt: z.date(), // default: now()
    updatedAt: z.date(), // default: now()
  })
  .strict();
