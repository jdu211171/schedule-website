import { z } from "zod";

// Enum for school type
const SchoolTypeEnum = z.enum(["PUBLIC", "PRIVATE"]);

// Enum for exam school type
const ExamSchoolTypeEnum = z.enum([
  "ELEMENTARY",
  "MIDDLE",
  "HIGH",
  "UNIVERSITY",
  "OTHER",
]);

// Base schema with common fields
const StudentBaseSchema = z.object({
  name: z.string().min(1).max(100),
  kanaName: z
    .string()
    .max(100)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  gradeId: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  schoolName: z
    .string()
    .max(100)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  schoolType: SchoolTypeEnum.optional(),
  examSchoolType: ExamSchoolTypeEnum.optional(),
  examSchoolCategoryType: ExamSchoolTypeEnum.optional(),
  firstChoiceSchool: z
    .string()
    .max(100)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  secondChoiceSchool: z
    .string()
    .max(100)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  enrollmentDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  birthDate: z.string().transform((val) => new Date(val)),
  homePhone: z
    .string()
    .max(20)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  parentMobile: z
    .string()
    .max(20)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  studentMobile: z
    .string()
    .max(20)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  parentEmail: z
    .string()
    .max(100)
    .email()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  notes: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Complete student schema (includes all fields from the database)
export const StudentSchema = StudentBaseSchema.extend({
  studentId: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new student
export const CreateStudentSchema = StudentBaseSchema.extend({
  userId: z.string(),
}).strict();

// Schema for updating an existing student
export const UpdateStudentSchema = StudentBaseSchema.extend({
  studentId: z.string(),
}).strict();

// Schema for retrieving a single student by ID
export const StudentIdSchema = z
  .object({
    studentId: z.string(),
  })
  .strict();

// Schema for querying students with filtering, pagination, and sorting
export const StudentQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    name: z.string().optional(),
    gradeName: z.string().optional(),
    schoolName: z.string().optional(),
    schoolType: z.enum(["PUBLIC", "PRIVATE"]).optional(),
    examSchoolType: z
      .enum(["ELEMENTARY", "MIDDLE", "HIGH", "UNIVERSITY", "OTHER"])
      .optional(),
    sort: z
      .enum([
        "name",
        "kanaName",
        "gradeId",
        "schoolName",
        "createdAt",
        "updatedAt",
      ])
      .optional()
      .default("name"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type Student = z.infer<typeof StudentSchema>;
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;
export type StudentQuery = z.infer<typeof StudentQuerySchema>;
