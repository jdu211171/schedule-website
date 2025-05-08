import { z } from "zod";
import { SubjectType } from "./subject-type.schema";
import { SubjectToSubjectType } from "./subject-to-subject-type.schema";
import { ClassSession } from "./class-session.schema";
import { TeacherSubject } from "./teacher-subject.schema";
import { ClassType } from "./class-type.schema";
import { RegularClassTemplate, StudentPreferenceSubject } from "@prisma/client";

// Base schema with common fields
const SubjectBaseSchema = z.object({
  name: z
    .string({ required_error: "入力は必須です" })
    .min(1, { message: "入力は必須です" })
    .max(100, { message: "100文字以内で入力してください" }),
  notes: z
    .string({ invalid_type_error: "255文字以内で入力してください" })
    .max(255, { message: "255文字以内で入力してください" })
    .nullable()
    .default("")
});

// Complete subject schema (includes all fields from the database)
export const SubjectSchema = SubjectBaseSchema.extend({
  subjectId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new subject (no subjectId needed as it will be generated)
export const CreateSubjectSchema = SubjectBaseSchema.extend({
  subjectTypeIds: z.array(z.string()).min(1, { message: "少なくとも1つの科目種別を選択してください" })
}).strict();

// Schema for updating an existing subject (requires subjectId)
export const UpdateSubjectSchema = z
  .object({
    subjectId: z.string({ required_error: "IDは必須です" }),
    name: z.string().min(1, { message: "入力は必須です" }).max(100, { message: "100文字以内で入力してください" }).optional(),
    notes: z
      .string({ invalid_type_error: "255文字以内で入力してください" })
      .max(255, { message: "255文字以内で入力してください" })
      .nullable()
      .default(""),
    subjectTypeIds: z.array(z.string()).min(1, { message: "少なくとも1つの科目種別を選択してください" }).optional()
  })
  .strict();

// Schema for retrieving a single subject by ID
export const SubjectIdSchema = z
  .object({
    subjectId: z.string({ required_error: "IDは必須です" }),
  })
  .strict();

// Schema for querying subjects with filtering, pagination, and sorting
export const SubjectQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100, { message: "100以下の値を入力してください" }).optional().default(10),
    name: z.string().optional(),
    subjectTypeId: z.string().optional(),
    sort: z
      .enum(["name", "createdAt", "updatedAt"]).optional().default("name"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type Subject = z.infer<typeof SubjectSchema>;
export type CreateSubjectInput = z.infer<typeof CreateSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof UpdateSubjectSchema>;
export type SubjectQuery = z.infer<typeof SubjectQuerySchema>;

// Updated SubjectWithRelations to match schema.prisma, using explicit types
export type SubjectWithRelations = {
  subjectId: string;
  name: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  subjectToSubjectTypes: SubjectToSubjectType[];
  classSessions: Array<ClassSession & { classType: ClassType }>;
  regularClassTemplates: RegularClassTemplate[];
  teacherSubjects: TeacherSubject[];
  StudentPreferenceSubject: StudentPreferenceSubject[];
};
