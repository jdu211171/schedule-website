import { z } from "zod";
import { StudentSchema } from "./student.schema";

export const StudentTypeSchema = z
  .object({
    studentTypeId: z.string(), // default: cuid()
    name: z.string().max(100),
    students: z.lazy(() => StudentSchema).array(), // relation: Student[]
    createdAt: z.date(), // default: now()
    updatedAt: z.date(), // default: now()
  })
  .strict();
