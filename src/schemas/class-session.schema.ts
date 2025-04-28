import { z } from "zod";

export const ClassSessionSchema = z
  .object({
    classId: z.string(), // default: cuid()
    date: z.date(),
    startTime: z.date(),
    endTime: z.date(),
    duration: z.date().optional(),
    teacherId: z.string().max(50),
    studentId: z.string().max(50),
    subjectId: z.string().max(50),
    boothId: z.string().max(50),
    classTypeId: z.string().max(50),
    booth: z.lazy(() => BoothSchema), // relation: Booth
    classType: z.lazy(() => ClassTypeSchema), // relation: ClassType
    subject: z.lazy(() => SubjectSchema), // relation: Subject
    teacher: z.lazy(() => TeacherSchema), // relation: Teacher
    student: z.lazy(() => StudentSchema), // relation: Student
    regularClassTemplate: z.lazy(() => RegularClassTemplateSchema).optional(), // relation: RegularClassTemplate
    studentClassEnrollments: z.lazy(() => StudentClassEnrollmentSchema).array(), // relation: StudentClassEnrollment[]
    createdAt: z.date(), // default: now()
    updatedAt: z.date(), // default: now()
  })
  .strict();
