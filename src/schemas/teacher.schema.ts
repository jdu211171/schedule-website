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
  name: z.string().min(1).max(100),
  evaluationId: z.string(),
  birthDate: z.string().transform((val) => new Date(val)),
  mobileNumber: z.string().max(20),
  email: z.string().email().max(100),
  highSchool: z.string().max(100),
  university: z.string().max(100),
  faculty: z.string().max(100),
  department: z.string().max(100),
  enrollmentStatus: z.string().max(50),
  otherUniversities: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  englishProficiency: z
    .string()
    .max(50)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  toeic: z
    .number()
    .int()
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  toefl: z
    .number()
    .int()
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  mathCertification: z
    .string()
    .max(50)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  kanjiCertification: z
    .string()
    .max(50)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  otherCertifications: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  notes: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
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
  userId: z.string(),
}).strict();

// Schema for creating a user+teacher
export const CreateUserTeacherSchema = z.object({
  // User fields
  username: z.string().min(3).max(50),
  password: z.string().min(6),

  // Teacher base fields
  name: z.string().min(1).max(100),
  evaluationId: z.string(),
  birthDate: z.string().transform((val) => new Date(val)),
  mobileNumber: z.string().max(20),
  email: z.string().email().max(100),
  highSchool: z.string().max(100),
  university: z.string().max(100),
  faculty: z.string().max(100),
  department: z.string().max(100),
  enrollmentStatus: z.string().max(50),
  otherUniversities: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  englishProficiency: z
    .string()
    .max(50)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  toeic: z
    .number()
    .int()
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  toefl: z
    .number()
    .int()
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  mathCertification: z
    .string()
    .max(50)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  kanjiCertification: z
    .string()
    .max(50)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  otherCertifications: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  shifts: z
    .array(
      z.object({
        dayOfWeek: DayOfWeekEnum,
        startTime: z.string(),
        endTime: z.string(),
        notes: z.string().optional(),
      })
    )
    .optional(),

  notes: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),

  // Optional teacher subjects
  subjects: z.array(z.string()).optional(),
});

// Schema for updating an existing teacher
export const UpdateTeacherSchema = z
  .object({
    teacherId: z.string(),
    name: z.string().min(1).max(100).optional(),
    evaluationId: z.string().optional(),
    birthDate: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
    mobileNumber: z.string().max(20).optional(),
    email: z.string().email().max(100).optional(),
    highSchool: z.string().max(100).optional(),
    university: z.string().max(100).optional(),
    faculty: z.string().max(100).optional(),
    department: z.string().max(100).optional(),
    enrollmentStatus: z.string().max(50).optional(),
    otherUniversities: z
      .string()
      .max(255)
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    englishProficiency: z
      .string()
      .max(50)
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    toeic: z
      .number()
      .int()
      .optional()
      .transform((val) => (val === 0 ? undefined : val)),
    toefl: z
      .number()
      .int()
      .optional()
      .transform((val) => (val === 0 ? undefined : val)),
    mathCertification: z
      .string()
      .max(50)
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    kanjiCertification: z
      .string()
      .max(50)
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    otherCertifications: z
      .string()
      .max(255)
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    notes: z
      .string()
      .max(255)
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  })
  .strict();

// Schema for updating a teacher with subjects
export const UpdateTeacherWithSubjectsSchema = z.object({
  teacherId: z.string(),

  // User fields
  password: z.string().min(6).optional(),

  // Teacher fields (all optional)
  name: z.string().min(1).max(100).optional(),
  evaluationId: z.string().optional(),
  birthDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  mobileNumber: z.string().max(20).optional(),
  email: z.string().email().max(100).optional(),
  highSchool: z.string().max(100).optional(),
  university: z.string().max(100).optional(),
  faculty: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  enrollmentStatus: z.string().max(50).optional(),
  otherUniversities: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  englishProficiency: z
    .string()
    .max(50)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  toeic: z
    .number()
    .int()
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  toefl: z
    .number()
    .int()
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  mathCertification: z
    .string()
    .max(50)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  kanjiCertification: z
    .string()
    .max(50)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  otherCertifications: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  shifts: z
    .array(
      z.object({
        dayOfWeek: DayOfWeekEnum,
        startTime: z.string(),
        endTime: z.string(),
        notes: z.string().optional(),
      })
    )
    .optional(),

  notes: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),

  // Optional subjects
  subjects: z.array(z.string()).optional(),
});

// Schema for retrieving a single teacher by ID
export const TeacherIdSchema = z
  .object({
    teacherId: z.string(),
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
