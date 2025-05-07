import { z } from "zod";

// Base schema with common fields
const RegularClassTemplateBaseSchema = z.object({
  dayOfWeek: z.enum(
    [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ],
    { required_error: "曜日は必須です", invalid_type_error: "曜日が無効です" }
  ),
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "開始時間は「HH:MM」形式で入力してください",
    }),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "終了時間は「HH:MM」形式で入力してください",
    }),
  teacherId: z.string({ required_error: "講師IDは必須です" }),
  subjectId: z.string({ required_error: "科目IDは必須です" }),
  subjectTypeId: z.string({ required_error: "科目タイプIDは必須です" }),
  boothId: z.string({ required_error: "ブースIDは必須です" }),
  classTypeId: z.string({ required_error: "授業タイプIDは必須です" }),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z
    .string()
    .max(255, { message: "備考は255文字以内で入力してください" })
    .optional(),
  studentIds: z.array(z.string({ required_error: "生徒IDは必須です" }), {
    required_error: "生徒IDリストは必須です",
    invalid_type_error: "生徒IDリストが無効です",
  }),
});

// Schema for finding available slots with filtering
export const AvailabilityFilterSchema = z.object({
  dayOfWeek: z.enum(
    [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ],
    { required_error: "曜日は必須です", invalid_type_error: "曜日が無効です" }
  ),
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "開始時間は「HH:MM」形式で入力してください",
    }),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "終了時間は「HH:MM」形式で入力してください",
    }),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  subjectId: z.string().optional(),
  subjectTypeId: z.string().optional(),
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
    templateId: z.string({ required_error: "テンプレートIDは必須です" }),
  })
    .partial()
    .required({ templateId: true })
    .strict();

// Schema for querying templates
export const TemplateQuerySchema = z.object({
  page: z
    .coerce
    .number()
    .int({ message: "ページ番号は整数で入力してください" })
    .positive({ message: "ページ番号は正の整数で入力してください" })
    .optional()
    .default(1),
  limit: z
    .coerce
    .number()
    .int({ message: "表示件数は整数で入力してください" })
    .positive({ message: "表示件数は正の整数で入力してください" })
    .max(100, { message: "表示件数は100以下で入力してください" })
    .optional()
    .default(10),
  dayOfWeek: z
    .enum(
      [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ],
      { invalid_type_error: "曜日が無効です" }
    )
    .optional(),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  subjectId: z.string().optional(),
  subjectTypeId: z.string().optional(),
  boothId: z.string().optional(),
  sort: z
    .enum(
      ["dayOfWeek", "startTime", "endTime", "createdAt", "updatedAt"],
      { invalid_type_error: "並び替えのフィールドが無効です" }
    )
    .optional()
    .default("dayOfWeek"),
  order: z
    .enum(["asc", "desc"], { invalid_type_error: "並び順が無効です" })
    .optional()
    .default("asc"),
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
