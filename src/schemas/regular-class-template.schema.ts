// regular-class-template.schema.ts
import { z } from "zod";

// Base schema with common fields
const RegularClassTemplateBaseSchema = z.object({
  dayOfWeek: z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ]),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  teacherId: z.string(),
  subjectId: z.string(),
  subjectTypeId: z.string().optional(),
  boothId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().max(255).optional(),
  studentIds: z.array(z.string()),
});

// Schema for finding available slots with filtering
export const AvailabilityFilterSchema = z.object({
  dayOfWeek: z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ]),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  subjectId: z.string().optional(),
  boothId: z.string().optional(),
});

// Schema for creating a single template
export const CreateRegularClassTemplateSchema =
  RegularClassTemplateBaseSchema.strict();

// Schema for batch creating multiple templates
export const BatchCreateRegularClassTemplateSchema = z.array(
  CreateRegularClassTemplateSchema
);

// Schema for updating a template
export const UpdateRegularClassTemplateSchema =
  RegularClassTemplateBaseSchema.extend({
    templateId: z.string(),
  })
    .partial()
    .required({ templateId: true })
    .strict();

// Schema for querying templates
export const TemplateQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  dayOfWeek: z
    .enum([
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ])
    .optional(),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  subjectId: z.string().optional(),
  subjectTypeId: z.string().optional(),
  boothId: z.string().optional(),
  sort: z
    .enum(["dayOfWeek", "startTime", "endTime", "createdAt", "updatedAt"])
    .optional()
    .default("dayOfWeek"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
});

// TypeScript types derived from the schemas
export type AvailabilityFilter = z.infer<typeof AvailabilityFilterSchema>;
export type CreateRegularClassTemplateInput = z.infer<
  typeof CreateRegularClassTemplateSchema
>;
export type BatchCreateRegularClassTemplateInput = z.infer<
  typeof BatchCreateRegularClassTemplateSchema
>;
export type UpdateRegularClassTemplateInput = z.infer<
  typeof UpdateRegularClassTemplateSchema
>;
export type TemplateQuery = z.infer<typeof TemplateQuerySchema>;
