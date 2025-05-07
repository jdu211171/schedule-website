import { Prisma } from "@prisma/client";
import { z } from "zod";

// Enum for school type
const SchoolTypeEnum = z.enum(["PUBLIC", "PRIVATE"], {
  required_error: "学校タイプは必須です",
});

// Enum for exam school type
const ExamSchoolTypeEnum = z.enum(
  ["ELEMENTARY", "MIDDLE", "HIGH", "UNIVERSITY", "OTHER"],
  { required_error: "受験学校区分は必須です" }
);

// Base schema with common fields (Japanese error messages)
const StudentBaseSchema = z.object({
  name: z
    .string({ required_error: "名前は必須です" })
    .min(1, { message: "入力は必須です" })
    .max(100, { message: "100文字以内で入力してください" }),
  kanaName: z
    .string({ required_error: "名前(カナ)は任意です" })
    .max(100, { message: "100文字以内で入力してください" })
    .nullish(),
  gradeId: z.string().nullish(),
  schoolName: z
    .string()
    .max(100, { message: "100文字以内で入力してください" })
    .nullish(),
  schoolType: SchoolTypeEnum.nullish(),
  examSchoolType: SchoolTypeEnum.nullish(),
  examSchoolCategoryType: ExamSchoolTypeEnum.nullish(),
  firstChoiceSchool: z
    .string()
    .max(100, { message: "100文字以内で入力してください" })
    .nullish(),
  secondChoiceSchool: z
    .string()
    .max(100, { message: "100文字以内で入力してください" })
    .nullish(),
  enrollmentDate: z.string().nullish(),
  birthDate: z.string({ required_error: "生年月日は必須です" }).transform((val) => new Date(val)),
  homePhone: z
    .string()
    .max(20, { message: "20文字以内で入力してください" })
    .nullish(),
  parentMobile: z
    .string()
    .max(20, { message: "20文字以内で入力してください" })
    .nullish(),
  studentMobile: z
    .string()
    .max(20, { message: "20文字以内で入力してください" })
    .nullish(),
  parentEmail: z
    .string()
    .max(100, { message: "100文字以内で入力してください" })
    .email({ message: "有効なメールアドレスを入力してください" })
    .nullish(),
  notes: z
    .string()
    .max(255, { message: "255文字以内で入力してください" })
    .nullish(),
});

// Complete student schema (includes all fields from the database)
export const StudentSchema = StudentBaseSchema.extend({
  studentId: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new student
export const CreateStudentSchema = StudentBaseSchema.strict();

// Schema for updating an existing student
export const UpdateStudentSchema = StudentBaseSchema.extend({
  studentId: z.string({ required_error: "IDは必須です" }),
}).strict();

// Schema for retrieving a single student by ID
export const StudentIdSchema = z
  .object({
    studentId: z.string({ required_error: "IDは必須です" }),
  })
  .strict();

// Schema for querying students with filtering, pagination, and sorting
export const StudentQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z
      .coerce.number()
      .int()
      .positive()
      .max(100, { message: "100以下の値を入力してください" })
      .default(10),
    name: z.string().optional(),
    gradeName: z.string().optional(),
    gradeId: z.union([z.string(), z.array(z.string())]).optional(),
    studentTypeId: z.union([z.string(), z.array(z.string())]).optional(),
    schoolName: z.string().optional(),
    schoolType: z.enum(["PUBLIC", "PRIVATE"]).optional(),
    examSchoolType: z
      .union([
        z.enum(["ELEMENTARY", "MIDDLE", "HIGH", "UNIVERSITY", "OTHER"]),
        z.array(z.enum(["ELEMENTARY", "MIDDLE", "HIGH", "UNIVERSITY", "OTHER"])),
      ])
      .optional(),
    preferredSubjectId: z.union([z.string(), z.array(z.string())]).optional(),
    sort: z
      .enum([
        "name",
        "kanaName",
        "gradeId",
        "schoolName",
        "createdAt",
        "updatedAt",
      ])
      .default("name"),
    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

// Define the schema for subject preference
const SubjectPreferenceSchema = z.object({
  subjectId: z.string({ required_error: "科目IDは必須です" }),
  subjectTypeId: z.string({ required_error: "科目種別IDは必須です" }),
});

// Schema for creating a user+student
export const CreateUserStudentSchema = StudentBaseSchema.extend({
  username: z
    .string({ required_error: "ユーザー名は必須です" })
    .min(3, { message: "3文字以上で入力してください" })
    .max(50, { message: "50文字以内で入力してください" }),
  password: z
    .string({ required_error: "パスワードは必須です" })
    .min(6, { message: "6文字以上で入力してください" }),
  preferences: z
    .object({
      classTypeId: z.string().nullish(),
      notes: z.string().nullish(),
      subjects: z.array(SubjectPreferenceSchema).optional(),
      teachers: z.array(z.string()).optional(),
      timeSlots: z
        .array(
          z.object({
            dayOfWeek: z
              .enum([
                "MONDAY",
                "TUESDAY",
                "WEDNESDAY",
                "THURSDAY",
                "FRIDAY",
                "SATURDAY",
                "SUNDAY",
              ]),
            startTime: z.string({ required_error: "開始時刻は必須です" }),
            endTime: z.string({ required_error: "終了時刻は必須です" }),
          })
        )
        .optional(),
    })
    .optional(),
});

export const UpdateStudentWithPreferencesSchema = UpdateStudentSchema.extend({
  password: z
    .string()
    .min(6, { message: "6文字以上で入力してください" })
    .optional(),
  preferences: z
    .object({
      classTypeId: z.string().nullish(),
      notes: z.string().nullish(),
      subjects: z.array(SubjectPreferenceSchema).optional(),
      teachers: z.array(z.string()).optional(),
      timeSlots: z
        .array(
          z.object({
            dayOfWeek: z
              .enum([
                "MONDAY",
                "TUESDAY",
                "WEDNESDAY",
                "THURSDAY",
                "FRIDAY",
                "SATURDAY",
                "SUNDAY",
              ]),
            startTime: z.string({ required_error: "開始時刻は必須です" }),
            endTime: z.string({ required_error: "終了時刻は必須です" }),
          })
        )
        .optional(),
    })
    .optional(),
});

// TypeScript types derived from the schemas
export type Student = z.infer<typeof StudentSchema>;
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;
export type StudentQuery = z.infer<typeof StudentQuerySchema>;
export type UpdateStudentWithPreferencesInput = z.infer<
  typeof UpdateStudentWithPreferencesSchema
>;
export type StudentWithGrade = Prisma.StudentGetPayload<{
  include: {
    grade: true;
  };
}>;
