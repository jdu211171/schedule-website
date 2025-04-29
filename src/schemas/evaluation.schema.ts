import { z } from "zod";

// Base schema with common fields
const EvaluationBaseSchema = z.object({
  name: z.string().min(1).max(100),
  score: z.number().int(),
  notes: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Complete evaluation schema (includes all fields from the database)
export const EvaluationSchema = EvaluationBaseSchema.extend({
  evaluationId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new evaluation (no evaluationId needed as it will be generated)
export const CreateEvaluationSchema = EvaluationBaseSchema.strict();

// Schema for updating an existing evaluation (requires evaluationId)
export const UpdateEvaluationSchema = EvaluationBaseSchema.extend({
  evaluationId: z.string(),
}).strict();

// Schema for retrieving a single evaluation by ID
export const EvaluationIdSchema = z
  .object({
    evaluationId: z.string(),
  })
  .strict();

// Schema for querying evaluations with filtering, pagination, and sorting
export const EvaluationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    name: z.string().optional(),
    score: z.coerce.number().int().optional(),
    sort: z
      .enum(["name", "score", "createdAt", "updatedAt"])
      .optional()
      .default("name"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type Evaluation = z.infer<typeof EvaluationSchema>;
export type CreateEvaluationInput = z.infer<typeof CreateEvaluationSchema>;
export type UpdateEvaluationInput = z.infer<typeof UpdateEvaluationSchema>;
export type EvaluationQuery = z.infer<typeof EvaluationQuerySchema>;
