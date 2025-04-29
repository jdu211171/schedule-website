import { z } from "zod";

// Base schema with common fields
const BoothBaseSchema = z.object({
  name: z.string().min(1).max(100),
  status: z.boolean().optional().default(true),
  notes: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Complete booth schema (includes all fields from the database)
export const BoothSchema = BoothBaseSchema.extend({
  boothId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new booth (no boothId needed as it will be generated)
export const CreateBoothSchema = BoothBaseSchema.strict();

// Schema for updating an existing booth (requires boothId)
export const UpdateBoothSchema = BoothBaseSchema.extend({
  boothId: z.string(),
}).strict();

// Schema for retrieving a single booth by ID
export const BoothIdSchema = z
  .object({
    boothId: z.string(),
  })
  .strict();

// Schema for querying booths with filtering, pagination, and sorting
export const BoothQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    name: z.string().optional(),
    status: z.enum(["true", "false"]).optional(),
    sort: z.enum(["name", "createdAt", "updatedAt"]).optional().default("createdAt"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type Booth = z.infer<typeof BoothSchema>;
export type CreateBoothInput = z.infer<typeof CreateBoothSchema>;
export type UpdateBoothInput = z.infer<typeof UpdateBoothSchema>;
export type BoothQuery = z.infer<typeof BoothQuerySchema>;
