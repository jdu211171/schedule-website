import { z } from "zod";

export const SubjectTypeSchema = z
  .object({
    subjectTypeId: z.string(), // default: cuid()
    name: z.string().max(100),
    subjects: z.lazy(() => SubjectSchema).array(), // relation: Subject[]
    createdAt: z.date(), // default: now()
  })
  .strict();
