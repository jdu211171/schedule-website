import { z } from "zod";

export const RegularClassTemplateSchema = z
  .object({
    templateId: z.string(), // default: cuid()
    dayOfWeek: DayOfWeekEnum,
    startTime: z.date(),
    endTime: z.date(),
    teacherId: z.string(),
    classTypeId: z.string(),
    boothId: z.string(),
    subjectId: z.string(),
    students: z.lazy(() => TemplateStudentAssignmentSchema).array(), // relation: TemplateStudentAssignment[]
    teacher: z.lazy(() => TeacherSchema), // relation: Teacher
    classType: z.lazy(() => ClassTypeSchema), // relation: ClassType
    booth: z.lazy(() => BoothSchema), // relation: Booth
    subject: z.lazy(() => SubjectSchema), // relation: Subject
    classSessions: z.lazy(() => ClassSessionSchema).array(), // relation: ClassSession[]
    createdAt: z.date(), // default: now()
    updatedAt: z.date(), // default: now()
  })
  .strict();
