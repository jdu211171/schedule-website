import { z } from "zod";

// Base schema with common fields
const BoothBaseSchema = z.object({
  name: z
    .string()
    .min(1, { message: "入力は必須です" })
    .max(100, { message: "100文字以内で入力してください" }),
  status: z.boolean().optional().default(true),
  notes: z
    .string()
    .max(255, { message: "255文字以内で入力してください" })
    .nullable()
    .default(""),
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
    boothId: z.string({ required_error: "IDは必須です" }),
  })
  .strict();

// Schema for querying booths with filtering, pagination, and sorting
export const BoothQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100, { message: "100以下の値を入力してください" }).optional().default(10),
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
