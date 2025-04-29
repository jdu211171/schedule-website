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
export const UpdateStudentSchema = z
  .object({
    studentId: z.string(),
    name: z.string().min(1).max(100).optional(),
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
    birthDate: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
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
  })
  .strict();

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


  // Schema for creating a user+student
  export const CreateUserStudentSchema = z.object({
    // User fields
    username: z.string().min(3).max(50),
    password: z.string().min(6),

    // Student base fields (reusing the existing schema without userId)
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
    schoolType: z.enum(["PUBLIC", "PRIVATE"]).optional(),
    examSchoolType: z
      .enum(["ELEMENTARY", "MIDDLE", "HIGH", "UNIVERSITY", "OTHER"])
      .optional(),
    examSchoolCategoryType: z
      .enum(["ELEMENTARY", "MIDDLE", "HIGH", "UNIVERSITY", "OTHER"])
      .optional(),
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

    // Optional preferences
    preferences: z
      .object({
        classTypeId: z.string().optional(),
        notes: z.string().optional(),
        subjects: z.array(z.string()).optional(),
        teachers: z.array(z.string()).optional(),
        timeSlots: z
          .array(
            z.object({
              dayOfWeek: z.enum([
                "MONDAY",
                "TUESDAY",
                "WEDNESDAY",
                "THURSDAY",
                "FRIDAY",
                "SATURDAY",
                "SUNDAY",
              ]),
              startTime: z.string(),
              endTime: z.string(),
            })
          )
          .optional(),
      })
      .optional(),
  });

export const UpdateStudentWithPreferencesSchema = z.object({
  studentId: z.string(),

  // Basic student fields (all optional)
  name: z.string().min(1).max(100).optional(),
  // User fields
  password: z.string().min(6).optional(),
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
  birthDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
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

  // Preferences (optional)
  preferences: z
    .object({
      classTypeId: z.string().optional().nullable(),
      notes: z.string().optional(),
      subjects: z.array(z.string()).optional(),
      teachers: z.array(z.string()).optional(),
      timeSlots: z
        .array(
          z.object({
            dayOfWeek: z.enum([
              "MONDAY",
              "TUESDAY",
              "WEDNESDAY",
              "THURSDAY",
              "FRIDAY",
              "SATURDAY",
              "SUNDAY",
            ]),
            startTime: z.string(),
            endTime: z.string(),
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
