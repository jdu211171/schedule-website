import { z } from "zod";

// Complete ClassSessionSchema with all required fields
export const ClassSessionSchema = z.object({
  classId: z.string(),
  date: z.date(),
  startTime: z.date(),
  endTime: z.date(),
  duration: z.date().optional(),
  teacherId: z
    .string()
    .max(50, { message: "講師IDは50文字以内で入力してください" }),
  studentId: z
    .string()
    .max(50, { message: "生徒IDは50文字以内で入力してください" }),
  subjectId: z
    .string()
    .max(50, { message: "科目IDは50文字以内で入力してください" }),
  subjectTypeId: z
    .string()
    .max(50, { message: "科目タイプIDは50文字以内で入力してください" }),
  boothId: z
    .string()
    .max(50, { message: "ブースIDは50文字以内で入力してください" }),
  classTypeId: z
    .string()
    .max(50, { message: "授業タイプIDは50文字以内で入力してください" }),
  templateId: z
    .string()
    .max(50, { message: "テンプレートIDは50文字以内で入力してください" })
    .optional(),
  notes: z
    .string()
    .max(255, { message: "備考は255文字以内で入力してください" })
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new standalone class session
export const CreateClassSessionSchema = z
  .object({
    date: z
      .string({ required_error: "日付は必須です" })
      .transform((val) => new Date(val)),
    startTime: z.string({ required_error: "開始時間は必須です" }),
    endTime: z.string({ required_error: "終了時間は必須です" }),
    teacherId: z
      .string({ required_error: "講師IDは必須です" })
      .max(50, { message: "講師IDは50文字以内で入力してください" }),
    studentId: z
      .string({ required_error: "生徒IDは必須です" })
      .max(50, { message: "生徒IDは50文字以内で入力してください" }),
    subjectId: z
      .string({ required_error: "科目IDは必須です" })
      .max(50, { message: "科目IDは50文字以内で入力してください" }),
    subjectTypeId: z
      .string({ required_error: "科目タイプIDは必須です" })
      .max(50, { message: "科目タイプIDは50文字以内で入力してください" }),
    boothId: z
      .string({ required_error: "ブースIDは必須です" })
      .max(50, { message: "ブースIDは50文字以内で入力してください" }),
    classTypeId: z
      .string({ required_error: "授業タイプIDは必須です" })
      .max(50, { message: "授業タイプIDは50文字以内で入力してください" }),
    notes: z
      .string()
      .max(255, { message: "備考は255文字以内で入力してください" })
      .optional(),
  })
  .strict();

// Schema for creating a new class session from a template
export const CreateClassSessionFromTemplateSchema = z
  .object({
    templateId: z
      .string({ required_error: "テンプレートIDは必須です" })
      .max(50, { message: "テンプレートIDは50文字以内で入力してください" }),
    date: z
      .string({ required_error: "日付は必須です" })
      .transform((val) => new Date(val)),
    startTime: z.string().optional(), // 任意のオーバーライド
    endTime: z.string().optional(), // 任意のオーバーライド
    boothId: z
      .string()
      .max(50, { message: "ブースIDは50文字以内で入力してください" })
      .optional(), // 任意のオーバーライド
    notes: z
      .string()
      .max(255, { message: "備考は255文字以内で入力してください" })
      .optional(),
  })
  .strict();

// Schema for updating a standalone class session (all fields can be modified)
export const UpdateStandaloneClassSessionSchema = z
  .object({
    classId: z.string({ required_error: "授業IDは必須です" }),
    date: z
      .string()
      .transform((val) => new Date(val))
      .optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    teacherId: z
      .string()
      .max(50, { message: "講師IDは50文字以内で入力してください" })
      .optional(),
    studentId: z
      .string()
      .max(50, { message: "生徒IDは50文字以内で入力してください" })
      .optional(),
    subjectId: z
      .string()
      .max(50, { message: "科目IDは50文字以内で入力してください" })
      .optional(),
    subjectTypeId: z
      .string()
      .max(50, { message: "科目タイプIDは50文字以内で入力してください" })
      .optional(),
    boothId: z
      .string()
      .max(50, { message: "ブースIDは50文字以内で入力してください" })
      .optional(),
    classTypeId: z
      .string()
      .max(50, { message: "授業タイプIDは50文字以内で入力してください" })
      .optional(),
    notes: z
      .string()
      .max(255, { message: "備考は255文字以内で入力してください" })
      .optional(),
  })
  .strict();

// Schema for updating a template-based class session (only specific fields can be modified)
export const UpdateTemplateClassSessionSchema = z
  .object({
    classId: z.string({ required_error: "授業IDは必須です" }),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    boothId: z
      .string()
      .max(50, { message: "ブースIDは50文字以内で入力してください" })
      .optional(),
    subjectTypeId: z
      .string()
      .max(50, { message: "科目タイプIDは50文字以内で入力してください" })
      .optional(),
    notes: z
      .string()
      .max(255, { message: "備考は255文字以内で入力してください" })
      .optional(),
  })
  .strict();

// Schema for retrieving a single class session by ID
export const ClassSessionIdSchema = z
  .object({
    classId: z.string({ required_error: "授業IDは必須です" }),
  })
  .strict();

// Schema for querying class sessions with filtering, pagination, and sorting
// Updated to support both single values and arrays of values for filter fields
export const ClassSessionQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int({ message: "ページ番号は整数で入力してください" })
      .positive({ message: "ページ番号は正の整数で入力してください" })
      .optional()
      .default(1),
    limit: z.coerce
      .number()
      .int({ message: "表示件数は整数で入力してください" })
      .positive({ message: "表示件数は正の整数で入力してください" })
      .max(100, { message: "表示件数は100以下で入力してください" })
      .optional()
      .default(10),
    date: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    teacherId: z.union([z.string(), z.array(z.string())]).optional(),
    studentId: z.union([z.string(), z.array(z.string())]).optional(),
    subjectId: z.union([z.string(), z.array(z.string())]).optional(),
    subjectTypeId: z.union([z.string(), z.array(z.string())]).optional(),
    boothId: z.union([z.string(), z.array(z.string())]).optional(),
    classTypeId: z.union([z.string(), z.array(z.string())]).optional(),
    templateId: z.union([z.string(), z.array(z.string())]).optional(),
    dayOfWeek: z
      .union([
        z.enum(
          [
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
            "SATURDAY",
            "SUNDAY",
          ],
          {
            invalid_type_error: "曜日の値が無効です",
          }
        ),
        z.array(
          z.enum(
            [
              "MONDAY",
              "TUESDAY",
              "WEDNESDAY",
              "THURSDAY",
              "FRIDAY",
              "SATURDAY",
              "SUNDAY",
            ],
            {
              invalid_type_error: "曜日の値が無効です",
            }
          )
        ),
      ])
      .optional(),
    isTemplateInstance: z
      .enum(["true", "false"], {
        invalid_type_error: "「true」または「false」を入力してください",
      })
      .optional(),
    sort: z
      .enum(["date", "startTime", "endTime", "createdAt", "updatedAt"], {
        invalid_type_error: "並び替えのフィールドが無効です",
      })
      .optional()
      .default("date"),
    order: z
      .enum(["asc", "desc"], {
        invalid_type_error: "並び順が無効です",
      })
      .optional()
      .default("asc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type ClassSession = z.infer<typeof ClassSessionSchema>;
export type CreateClassSessionInput = z.infer<typeof CreateClassSessionSchema>;
export type CreateClassSessionFromTemplateInput = z.infer<
  typeof CreateClassSessionFromTemplateSchema
>;
export type UpdateStandaloneClassSessionInput = z.infer<
  typeof UpdateStandaloneClassSessionSchema
>;
export type UpdateTemplateClassSessionInput = z.infer<
  typeof UpdateTemplateClassSessionSchema
>;
export type ClassSessionQuery = z.infer<typeof ClassSessionQuerySchema>;
