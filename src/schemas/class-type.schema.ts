import { z } from "zod";

export const ClassTypeSchema = z
  .object({
    classTypeId: z.string(), // default: cuid()
    name: z.string().max(100),
    notes: z.string().max(255).optional(),
    classSessions: z.lazy(() => ClassSessionSchema).array(), // relation: ClassSession[]
    createdAt: z.date(), // default: now()
    updatedAt: z.date(), // default: now()
  })
  .strict();
