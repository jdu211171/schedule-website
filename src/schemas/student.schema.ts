// src/schemas/student.schema.ts
import { z } from "zod";

// Subject preference schema for student registration - UPDATED
export const subjectPreferenceSchema = z.object({
  subjectId: z.string().min(1, "科目を選択してください"),
  subjectTypeIds: z
    .array(z.string())
    .min(1, "少なくとも1つの科目タイプを選択してください"),
  preferredTeacherIds: z.array(z.string()).optional().default([]), // Added teacher preferences
});

// Time slot schema for regular availability
export const timeSlotSchema = z
  .object({
    id: z.string(),
    startTime: z
      .string()
      .regex(
        /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "有効な時間形式で入力してください"
      ),
    endTime: z
      .string()
      .regex(
        /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "有効な時間形式で入力してください"
      ),
  })
  .refine((data) => data.startTime !== data.endTime, {
    message: "開始時間と終了時間は異なる必要があります",
  });

// Regular availability schema for student registration
export const regularAvailabilitySchema = z
  .object({
    dayOfWeek: z.enum([
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ]),
    timeSlots: z.array(timeSlotSchema).default([]),
    fullDay: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // If not full day, must have at least one time slot or be explicitly empty
      if (!data.fullDay && data.timeSlots.length === 0) {
        return true; // Allow empty time slots for days with no availability
      }

      // If full day, should not have time slots
      if (data.fullDay && data.timeSlots.length > 0) {
        return false;
      }

      // Check for overlapping time slots
      if (data.timeSlots.length > 1) {
        const sortedSlots = [...data.timeSlots].sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        );

        for (let i = 0; i < sortedSlots.length - 1; i++) {
          const current = sortedSlots[i];
          const next = sortedSlots[i + 1];

          if (current.endTime > next.startTime) {
            return false;
          }
        }
      }

      return true;
    },
    {
      message:
        "時間帯が重複しているか、終日設定と時間指定が同時に設定されています",
    }
  );

// User status enum
export const userStatusEnum = z.enum(["ACTIVE", "SICK", "PERMANENTLY_LEFT"]);

export const userStatusLabels = {
  ACTIVE: "在籍",
  SICK: "休会",
  PERMANENTLY_LEFT: "退会",
} as const;

export const studentBaseSchema = z.object({
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(100, "名前は100文字以内で入力してください"),
  kanaName: z
    .string()
    .max(100, "カナは100文字以内で入力してください")
    .optional()
    .nullable(),
  studentTypeId: z.string().optional().nullable(),
  gradeYear: z
    .number({ invalid_type_error: "学年は数字で入力してください" })
    .int("学年は整数で入力してください")
    .positive("学年は正の数で入力してください")
    .optional()
    .nullable(),
  lineId: z
    .string()
    .max(50, "LINE IDは50文字以内で入力してください")
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(255, "備考は255文字以内で入力してください")
    .optional()
    .nullable(),
  status: userStatusEnum.optional().default("ACTIVE"),
  // User account related fields
  username: z.string().min(3, "ユーザー名は3文字以上で入力してください"),
  password: z
    .string()
    .refine((value) => value.length === 0 || value.length >= 6, {
      message:
        "パスワードは6文字以上で入力してください。変更しない場合は空欄のままにしてください。",
    })
    .optional()
    .nullable(),
  email: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: "有効なメールアドレス形式で入力してください",
    }),
  branchIds: z
    .array(z.string(), { invalid_type_error: "校舎を選択してください" })
    .optional(),
  // Subject preferences
  subjectPreferences: z.array(subjectPreferenceSchema).optional().default([]),
  // Enhanced regular availability with multiple time slots
  regularAvailability: z
    .array(regularAvailabilitySchema)
    .optional()
    .default([]),
  // Exceptional availability for specific dates
  exceptionalAvailability: z
    .array(
      z.object({
        userId: z.string().optional(),
        date: z.coerce.date(),
        endDate: z.coerce.date().optional(), // Added for date range support
        fullDay: z.boolean().default(false),
        type: z.literal("EXCEPTION"),
        startTime: z.string().optional().nullable(),
        endTime: z.string().optional().nullable(),
        reason: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .optional()
    .default([]),
});

// Dynamic form schema that accepts student types for validation
export const createStudentFormSchema = (studentTypes?: Array<{ studentTypeId: string; maxYears: number | null }>) => {
  return studentBaseSchema.extend({
    studentId: z.string().optional(),
  }).refine((data) => {
    // Skip validation if either field is missing
    if (!data.studentTypeId || !data.gradeYear) {
      return true;
    }

    // Find the selected student type
    const selectedStudentType = studentTypes?.find(type => type.studentTypeId === data.studentTypeId);

    // If student type not found or has no maxYears limit, allow any grade year
    if (!selectedStudentType || !selectedStudentType.maxYears) {
      return true;
    }

    // Validate that gradeYear doesn't exceed maxYears
    return data.gradeYear <= selectedStudentType.maxYears;
  }, {
    message: "学年が選択された生徒タイプの最大学年数を超えています",
    path: ["gradeYear"],
  });
};

// Default form schema for backward compatibility
export const studentFormSchema = studentBaseSchema.extend({
  studentId: z.string().optional(),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

export const studentCreateSchema = studentBaseSchema.extend({
  password: z.string().min(6, "パスワードは6文字以上で入力してください"), // Password is required for creation
});

export const studentUpdateSchema = studentBaseSchema
  .partial() // Make all base fields optional for update
  .extend({
    // Ensure studentId is required for update
    studentId: z.string({ required_error: "更新には生徒IDが必要です" }),
    // Password from studentBaseSchema.partial() is now correctly optional
    // and allows an empty string (for no change) or a min 6 char string if provided.
  });

export const studentFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
  studentTypeId: z.string().optional(),
  studentTypeIds: z.array(z.string()).optional(), // Support multiple student type IDs
  gradeYear: z.coerce.number().int().optional(),
  status: userStatusEnum.optional(),
});

export type StudentCreate = z.infer<typeof studentCreateSchema>;
export type StudentUpdate = z.infer<typeof studentUpdateSchema>;
export type StudentFilter = z.infer<typeof studentFilterSchema>;
