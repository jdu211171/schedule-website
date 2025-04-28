import { z } from "zod";

// Base schema with common fields
const BoothBaseSchema = z.object({
  name: z.string().max(100),
  status: z.boolean().optional(),
  notes: z.string().max(255).optional(),
});

// Schema for creating a new booth (no boothId needed as it will be generated)
export const CreateBoothSchema = BoothBaseSchema.strict();

// Schema for updating an existing booth (requires boothId)
export const UpdateBoothSchema = BoothBaseSchema.extend({
  boothId: z.string(),
}).strict();

// Schema for filtering booths
export const FilterBoothSchema = z
  .object({
    name: z.string().optional(),
    status: z.boolean().optional(),
  })
  .strict();

export const BoothQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    name: z.string().optional(),
    status: z.enum(["true", "false"]).optional(),
    sort: z.enum(["name", "createdAt", "updatedAt"]).optional().default("name"),
    order: z.enum(["asc", "desc"]).optional().default("asc"),
  })
  .strict();

export type BoothQuery = z.infer<typeof BoothQuerySchema>;

