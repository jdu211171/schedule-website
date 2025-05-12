import { z } from "zod";

// Unrefined base object schema
const EventObjectSchema = z.object({
  name: z
    .string()
    .min(1, { message: "入力は必須です" })
    .max(100, { message: "100文字以内で入力してください" }),
  startDate: z.preprocess(
    // Convert various date formats to Date object
    (arg) => {
      if (arg instanceof Date) return arg;
      if (typeof arg === "string") {
        // Try to parse the string to a date
        const date = new Date(arg);
        if (!isNaN(date.getTime())) return date;
      }
      return undefined;
    },
    z.date({
      required_error: "開始日は必須です",
      invalid_type_error: "有効な日付を入力してください",
    })
  ),
  endDate: z.preprocess(
    // Convert various date formats to Date object
    (arg) => {
      if (arg instanceof Date) return arg;
      if (typeof arg === "string") {
        // Try to parse the string to a date
        const date = new Date(arg);
        if (!isNaN(date.getTime())) return date;
      }
      return undefined;
    },
    z.date({
      required_error: "終了日は必須です",
      invalid_type_error: "有効な日付を入力してください",
    })
  ),
  isRecurring: z.boolean().optional().default(false),
});

// Helper for refinement logic
const eventDateRefinementFn = (data: z.infer<typeof EventObjectSchema>) => {
  return data.endDate >= data.startDate;
};
const eventDateRefinementParams = {
  message: "終了日は開始日以降の日付にしてください",
  path: ["endDate"],
};

// Base schema with common fields
const EventBaseSchema = EventObjectSchema.refine(
  eventDateRefinementFn,
  eventDateRefinementParams
);

// Complete event schema (includes all fields from the database)
export const EventSchema = EventObjectSchema.extend({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
}).refine(eventDateRefinementFn, eventDateRefinementParams);

// Schema for creating a new event (no id needed as it will be generated)
export const CreateEventSchema = EventObjectSchema.strict().refine(
  eventDateRefinementFn,
  eventDateRefinementParams
);

// Schema for updating an existing event (requires id)
export const UpdateEventSchema = EventObjectSchema.extend({
  id: z.string(),
})
  .strict()
  .refine(eventDateRefinementFn, eventDateRefinementParams);

// Schema for retrieving a single event by ID
export const EventIdSchema = z
  .object({
    id: z.string({ required_error: "IDは必須です" }),
  })
  .strict();

// Schema for querying events with filtering, pagination, and sorting
export const EventQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(100, { message: "100以下の値を入力してください" })
      .optional()
      .default(10),
    name: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isRecurring: z.enum(["true", "false"]).optional(),
    sort: z
      .enum(["name", "startDate", "endDate", "createdAt", "updatedAt"])
      .optional()
      .default("startDate"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type Event = z.infer<typeof EventSchema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
export type EventQuery = z.infer<typeof EventQuerySchema>;
