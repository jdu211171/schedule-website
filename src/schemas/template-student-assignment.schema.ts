import { z } from "zod";

export const TemplateStudentAssignmentSchema = z
  .object({
    assignmentId: z.string(), // default: cuid()
    templateId: z.string(),
    studentId: z.string(),
    template: z.lazy(() => RegularClassTemplateSchema), // relation: RegularClassTemplate
    student: z.lazy(() => StudentSchema), // relation: Student
  })
  .strict();
