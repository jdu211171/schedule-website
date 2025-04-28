import { z } from "zod";

export const SubjectSchema = z
  .object({
    subjectId: z.string(), // default: cuid()
    name: z.string().max(100),
    subjectTypeId: z.string(),
    classSessions: z.lazy(() => ClassSessionSchema).array(), // relation: ClassSession[]
    teacherSubjects: z.lazy(() => TeacherSubjectSchema).array(), // relation: TeacherSubject[]
    evaluations: z.lazy(() => EvaluationSchema).array(), // relation: Evaluation[]
    regularClassTemplates: z.lazy(() => RegularClassTemplateSchema).array(), // relation: RegularClassTemplate[]
    subjectType: z.lazy(() => SubjectTypeSchema), // relation: SubjectType
    createdAt: z.date(), // default: now()
  })
  .strict();
