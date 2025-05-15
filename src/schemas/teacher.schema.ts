import { z } from "zod";

// Enum for DayOfWeek (from Prisma)
export const DayOfWeekEnum = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

// Base schema with common fields
const TeacherBaseSchema = z.object({
  name: z.string().min(1, { message: "名前は必須です" }).max(100, { message: "名前は100文字以内で入力してください" }),
  evaluationId: z.string({ required_error: "評価は必須です" }),
  birthDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  mobileNumber: z.string().max(20, { message: "携帯電話番号は20文字以内で入力してください" }),
  email: z.string().email({ message: "有効なメールアドレスを入力してください" }).max(100, { message: "メールアドレスは100文字以内で入力してください" }),
  highSchool: z.string().max(100, { message: "高校名は100文字以内で入力してください" }),
  university: z.string().max(100, { message: "大学名は100文字以内で入力してください" }),
  faculty: z.string().max(100, { message: "学部名は100文字以内で入力してください" }),
  department: z.string().max(100, { message: "学科名は100文字以内で入力してください" }),
  enrollmentStatus: z.string().max(50, { message: "在籍状況は50文字以内で入力してください" }),
  otherUniversities: z
    .string()
    .max(255, { message: "その他の大学は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  englishProficiency: z
    .string()
    .max(50, { message: "英語能力は50文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  toeic: z
    .number()
    .int({ message: "TOEICスコアは整数で入力してください" })
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  toefl: z
    .number()
    .int({ message: "TOEFLスコアは整数で入力してください" })
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  mathCertification: z
    .string()
    .max(50, { message: "数学関連資格は50文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  kanjiCertification: z
    .string()
    .max(50, { message: "漢字関連資格は50文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  otherCertifications: z
    .string()
    .max(255, { message: "その他の資格は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  notes: z
    .string()
    .max(255, { message: "備考は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Define the schema for subject assignment
const SubjectAssignmentSchema = z.object({
  subjectId: z.string({ required_error: "科目IDは必須です" }),
  subjectTypeId: z.string({ required_error: "科目タイプIDは必須です" }),
});

// Complete teacher schema (includes all fields from the database)
export const TeacherSchema = TeacherBaseSchema.extend({
  teacherId: z.string(),
  userId: z.string(),
  createdAt: z.string().transform((val) => new Date(val)),
  updatedAt: z.string().transform((val) => new Date(val)),
});

// Schema for creating a new teacher
export const CreateTeacherSchema = TeacherBaseSchema.extend({
  userId: z.string({ required_error: "ユーザーIDは必須です" }),
}).strict();

// Schema for creating a user+teacher
export const CreateUserTeacherSchema = z.object({
  // User fields
  username: z.string().min(3, { message: "ログインIDは3文字以上で入力してください" }).max(50, { message: "ログインIDは50文字以内で入力してください" }),
  password: z.string().min(6, { message: "パスワードは6文字以上で入力してください" }),

  // Teacher base fields
  name: z.string().min(1, { message: "名前は必須です" }).max(100, { message: "名前は100文字以内で入力してください" }),
  evaluationId: z.string().optional(),
  birthDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  mobileNumber: z.string().max(20, { message: "携帯電話番号は20文字以内で入力してください" }),
  email: z.string().email({ message: "有効なメールアドレスを入力してください" }).max(100, { message: "メールアドレスは100文字以内で入力してください" }),
  highSchool: z.string().max(100, { message: "高校名は100文字以内で入力してください" }),
  university: z.string().max(100, { message: "大学名は100文字以内で入力してください" }),
  faculty: z.string().max(100, { message: "学部名は100文字以内で入力してください" }),
  department: z.string().max(100, { message: "学科名は100文字以内で入力してください" }),
  enrollmentStatus: z.string().max(50, { message: "在籍状況は50文字以内で入力してください" }),
  otherUniversities: z
    .string()
    .max(255, { message: "その他の大学は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  englishProficiency: z
    .string()
    .max(50, { message: "英語能力は50文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  toeic: z
    .number()
    .int({ message: "TOEICスコアは整数で入力してください" })
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  toefl: z
    .number()
    .int({ message: "TOEFLスコアは整数で入力してください" })
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  mathCertification: z
    .string()
    .max(50, { message: "数学関連資格は50文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  kanjiCertification: z
    .string()
    .max(50, { message: "漢字関連資格は50文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  otherCertifications: z
    .string()
    .max(255, { message: "その他の資格は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  shifts: z
    .array(
      z.object({
        dayOfWeek: DayOfWeekEnum,
        startTime: z.string({ required_error: "シフト開始時間は必須です" }),
        endTime: z.string({ required_error: "シフト終了時間は必須です" }),
        notes: z.string().optional(),
      })
    )
    .optional(),

  notes: z
    .string()
    .max(255, { message: "備考は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),

  // Updated teacher subjects
  subjects: z
    .array(SubjectAssignmentSchema)
    .optional(),
});

// Schema for updating an existing teacher
export const UpdateTeacherSchema = z
  .object({
    teacherId: z.string({ required_error: "教師IDは必須です" }),
    name: z.string().min(1, { message: "名前は必須です" }).max(100, { message: "名前は100文字以内で入力してください" }).optional(),
    evaluationId: z.string({ required_error: "評価は必須です" }).optional(),
    birthDate: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
    mobileNumber: z.string().max(20, { message: "携帯電話番号は20文字以内で入力してください" }).optional(),
    email: z.string().email({ message: "有効なメールアドレスを入力してください" }).max(100, { message: "メールアドレスは100文字以内で入力してください" }).optional(),
    highSchool: z.string().max(100, { message: "高校名は100文字以内で入力してください" }).optional(),
    university: z.string().max(100, { message: "大学名は100文字以内で入力してください" }).optional(),
    faculty: z.string().max(100, { message: "学部名は100文字以内で入力してください" }).optional(),
    department: z.string().max(100, { message: "学科名は100文字以内で入力してください" }).optional(),
    enrollmentStatus: z.string().max(50, { message: "在籍状況は50文字以内で入力してください" }).optional(),
    otherUniversities: z
      .string()
      .max(255, { message: "その他の大学は255文字以内で入力してください" })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    englishProficiency: z
      .string()
      .max(50, { message: "英語能力は50文字以内で入力してください" })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    toeic: z
      .number()
      .int({ message: "TOEICスコアは整数で入力してください" })
      .optional()
      .transform((val) => (val === 0 ? undefined : val)),
    toefl: z
      .number()
      .int({ message: "TOEFLスコアは整数で入力してください" })
      .optional()
      .transform((val) => (val === 0 ? undefined : val)),
    mathCertification: z
      .string()
      .max(50, { message: "数学関連資格は50文字以内で入力してください" })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    kanjiCertification: z
      .string()
      .max(50, { message: "漢字関連資格は50文字以内で入力してください" })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    otherCertifications: z
      .string()
      .max(255, { message: "その他の資格は255文字以内で入力してください" })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    notes: z
      .string()
      .max(255, { message: "備考は255文字以内で入力してください" })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  })
  .strict();

// Schema for updating a teacher with subjects
export const UpdateTeacherWithSubjectsSchema = z.object({
  teacherId: z.string({ required_error: "教師IDは必須です" }),

  // User fields
  password: z
    .string()
    .min(6, { message: "パスワードは6文字以上で入力してください" })
    .optional(),

  // Teacher fields (all optional)
  name: z.string().min(1, { message: "名前は必須です" }).max(100, { message: "名前は100文字以内で入力してください" }).optional(),
  evaluationId: z.string({ required_error: "評価は必須です" }).optional(),
  birthDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  mobileNumber: z.string().max(20, { message: "携帯電話番号は20文字以内で入力してください" }).optional(),
  email: z.string().email({ message: "有効なメールアドレスを入力してください" }).max(100, { message: "メールアドレスは100文字以内で入力してください" }).optional(),
  highSchool: z.string().max(100, { message: "高校名は100文字以内で入力してください" }).optional(),
  university: z.string().max(100, { message: "大学名は100文字以内で入力してください" }).optional(),
  faculty: z.string().max(100, { message: "学部名は100文字以内で入力してください" }).optional(),
  department: z.string().max(100, { message: "学科名は100文字以内で入力してください" }).optional(),
  enrollmentStatus: z.string().max(50, { message: "在籍状況は50文字以内で入力してください" }).optional(),
  otherUniversities: z
    .string()
    .max(255, { message: "その他の大学は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  englishProficiency: z
    .string()
    .max(50, { message: "英語能力は50文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  toeic: z
    .number()
    .int({ message: "TOEICスコアは整数で入力してください" })
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  toefl: z
    .number()
    .int({ message: "TOEFLスコアは整数で入力してください" })
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  mathCertification: z
    .string()
    .max(50, { message: "数学関連資格は50文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  kanjiCertification: z
    .string()
    .max(50, { message: "漢字関連資格は50文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  otherCertifications: z
    .string()
    .max(255, { message: "その他の資格は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  shifts: z
    .array(
      z.object({
        dayOfWeek: DayOfWeekEnum,
        startTime: z.string({ required_error: "シフト開始時間は必須です" }),
        endTime: z.string({ required_error: "シフト終了時間は必須です" }),
        notes: z.string().optional(),
      })
    )
    .optional(),

  notes: z
    .string()
    .max(255, { message: "備考は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),

  // Updated optional subjects
  subjects: z
    .array(SubjectAssignmentSchema)
    .optional(),
});

// Schema for retrieving a single teacher by ID
export const TeacherIdSchema = z
  .object({
    teacherId: z.string({ required_error: "教師IDは必須です" }),
  })
  .strict();

// Schema for querying teachers with filtering, pagination, and sorting
export const TeacherQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    name: z.string().optional(),
    email: z.string().optional(),
    university: z.string().optional(),
    enrollmentStatus: z.string().optional(),
    subjectId: z.union([z.string(), z.array(z.string())]).optional(),
    evaluationId: z.union([z.string(), z.array(z.string())]).optional(),
    sort: z
      .enum([
        "name",
        "email",
        "university",
        "faculty",
        "enrollmentStatus",
        "createdAt",
        "updatedAt",
      ])
      .optional()
      .default("name"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type Teacher = z.infer<typeof TeacherSchema>;
export type CreateTeacherInput = z.infer<typeof CreateTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof UpdateTeacherSchema>;
export type TeacherQuery = z.infer<typeof TeacherQuerySchema>;
export type UpdateTeacherWithSubjectsInput = z.infer<
  typeof UpdateTeacherWithSubjectsSchema
>;
