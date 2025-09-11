// src/schemas/teacher.schema.ts
import { z } from "zod";

// Contact email schema for teacher
export const contactEmailSchema = z.object({
  id: z.string().optional(),
  email: z.string().email("有効なメールアドレスを入力してください"),
  notes: z
    .string()
    .max(255, "備考は255文字以内で入力してください")
    .optional()
    .nullable(),
  order: z.number().optional().default(0),
});

// Contact phone schema for teacher (no type)
export const contactPhoneSchema = z.object({
  id: z.string().optional(),
  phoneNumber: z
    .string()
    .min(1, "電話番号は必須です")
    .max(50, "電話番号は50文字以内で入力してください"),
  notes: z
    .string()
    .max(255, "備考は255文字以内で入力してください")
    .optional()
    .nullable(),
  order: z.number().optional().default(0),
});

// Subject preference schema for teacher registration
export const subjectPreferenceSchema = z.object({
  subjectId: z.string().min(1, "科目を選択してください"),
  subjectTypeIds: z
    .array(z.string())
    .min(1, "少なくとも1つの科目タイプを選択してください"),
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

// Regular availability schema for teacher registration
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

// 共通フィールドのベーススキーマ
const teacherBaseSchema = z.object({
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(100, "名前は100文字以内で入力してください"),
  kanaName: z
    .string()
    .max(100, "カナは100文字以内で入力してください")
    .optional()
    .nullable(),
  email: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: "有効なメールアドレス形式で入力してください",
    }),
  lineId: z
    .string()
    .max(50, "LINE IDは50文字以内で入力してください")
    .optional()
    .nullable(),
  lineUserId: z
    .string()
    .max(50, "LINEユーザーIDは50文字以内で入力してください")
    .optional()
    .nullable(),
  lineNotificationsEnabled: z
    .boolean()
    .optional()
    .default(true),
  notes: z
    .string()
    .max(255, "備考は255文字以内で入力してください")
    .optional()
    .nullable(),
  status: userStatusEnum.optional().default("ACTIVE"),
  birthDate: z
    .coerce
    .date()
    .optional()
    .nullable(),
  // Legacy phone fields (for backward compatibility)
  phoneNumber: z
    .string()
    .max(50, "携帯番号は50文字以内で入力してください")
    .optional()
    .nullable(),
  phoneNotes: z
    .string()
    .max(255, "電話番号備考は255文字以内で入力してください")
    .optional()
    .nullable(),
  // New contact phones array
  contactPhones: z.array(contactPhoneSchema).optional().default([]),
  // New contact emails array (non-login informational emails)
  contactEmails: z.array(contactEmailSchema).optional().default([]),
  username: z.string().min(3, "ユーザー名は3文字以上で入力してください"),
  // パスワードはフォーム上は任意、作成時は必須
  password: z
    .string()
    .refine((value) => value.length === 0 || value.length >= 6, {
      message:
        "パスワードは6文字以上で入力してください。変更しない場合は空欄のままにしてください。",
    })
    .optional()
    .nullable(),
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
  // Absence (exceptional unavailability) for specific dates
  absenceAvailability: z
    .array(
      z.object({
        userId: z.string().optional(),
        date: z.coerce.date(),
        endDate: z.coerce.date().optional(),
        fullDay: z.boolean().default(false),
        type: z.literal("ABSENCE"),
        startTime: z.string().optional().nullable(),
        endTime: z.string().optional().nullable(),
        reason: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .optional()
    .default([]),
});

// フォーム用の統一スキーマ（teacherIdは任意）
export const teacherFormSchema = teacherBaseSchema.extend({
  teacherId: z.string().optional(),
});

export type TeacherFormValues = z.infer<typeof teacherFormSchema>;

// 作成用スキーマ（パスワード必須）
export const teacherCreateSchema = teacherBaseSchema.extend({
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
});

// 更新用スキーマ（teacherId必須、他は任意）
export const teacherUpdateSchema = teacherBaseSchema.partial().extend({
  teacherId: z.string({ required_error: "更新には講師IDが必要です" }),
  // Override array fields to avoid defaulting to [] on update
  subjectPreferences: z.array(subjectPreferenceSchema).optional(),
  regularAvailability: z.array(regularAvailabilitySchema).optional(),
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
    .optional(),
  absenceAvailability: z
    .array(
      z.object({
        userId: z.string().optional(),
        date: z.coerce.date(),
        endDate: z.coerce.date().optional(),
        fullDay: z.boolean().default(false),
        type: z.literal("ABSENCE"),
        startTime: z.string().optional().nullable(),
        endTime: z.string().optional().nullable(),
        reason: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .optional(),
  contactPhones: z.array(contactPhoneSchema).optional(),
  contactEmails: z.array(contactEmailSchema).optional(),
});

export const teacherFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
  status: userStatusEnum.optional(),
  statuses: z.array(userStatusEnum).optional(),
  birthDateFrom: z.string().optional(),
  birthDateTo: z.string().optional(),
});

export type TeacherCreate = z.infer<typeof teacherCreateSchema>;
export type TeacherUpdate = z.infer<typeof teacherUpdateSchema>;
export type TeacherFilter = z.infer<typeof teacherFilterSchema>;
