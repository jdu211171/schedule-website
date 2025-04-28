import { z } from "zod";
import { Grade } from "@prisma/client";

const ExamSchoolTypeEnum = z.enum([
  "ELEMENTARY",
  "MIDDLE",
  "HIGH",
  "UNIVERSITY",
  "OTHER",
]);

export const studentCreateSchema = z.object({
  name: z.string().max(100),
  kanaName: z.string().max(100).nullable(),
  gradeId: z.string().max(50).nullable(),
  schoolName: z.string().max(100).nullable(),
  schoolType: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  examSchoolType: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  examSchoolCategoryType: ExamSchoolTypeEnum.nullable(),
  firstChoiceSchool: z.string().max(100).nullable(),
  secondChoiceSchool: z.string().max(100).nullable(),
  enrollmentDate: z.date().nullable(),
  birthDate: z.date(), // Note: This is now required based on schema.prisma
  homePhone: z.string().max(20).nullable(),
  parentMobile: z.string().max(20).nullable(),
  studentMobile: z.string().max(20).nullable(),
  parentEmail: z.string().max(100).nullable(),
  notes: z.string().nullable(),
  userId: z.string().nullable().optional(),
  username: z.string().min(1, { message: "ユーザー名は必須です" }).optional(),
  password: z
    .string()
    .min(6, { message: "パスワードは6文字以上である必要があります" })
    .optional(),
});

export const studentUpdateSchema = studentCreateSchema.partial().extend({
  studentId: z.string().cuid({ message: "Invalid ID" }),
});

// Updated to match the new normalized structure
export const studentPreferenceSchema = z.object({
  preferenceId: z.string(),
  studentId: z.string(),
  classTypeId: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  // These are now relationships, not embedded arrays
  teachers: z.array(
    z.object({
      id: z.string(),
      studentPreferenceId: z.string(),
      teacherId: z.string(),
      teacher: z
        .object({
          teacherId: z.string(),
          name: z.string(),
          // Add other needed teacher fields
        })
        .optional(),
    })
  ),
  subjects: z.array(
    z.object({
      id: z.string(),
      studentPreferenceId: z.string(),
      subjectId: z.string(),
      subject: z
        .object({
          subjectId: z.string(),
          name: z.string(),
          // Add other needed subject fields
        })
        .optional(),
    })
  ),
  timeSlots: z.array(
    z.object({
      slotId: z.string(),
      preferenceId: z.string(),
      dayOfWeek: z.enum([
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ]),
      startTime: z.date(),
      endTime: z.date(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
  ),
});

export const studentSchema = z.object({
  studentId: z.string(),
  name: z.string(),
  kanaName: z.string().nullable(),
  gradeId: z.string().nullable(),
  schoolName: z.string().nullable(),
  schoolType: z.enum(["PUBLIC", "PRIVATE"]).nullable(),
  examSchoolType: z.enum(["PUBLIC", "PRIVATE"]).nullable(),
  examSchoolCategoryType: ExamSchoolTypeEnum.nullable(),
  firstChoiceSchool: z.string().nullable(),
  secondChoiceSchool: z.string().nullable(),
  enrollmentDate: z.date().nullable(),
  birthDate: z.date(),
  homePhone: z.string().nullable(),
  parentMobile: z.string().nullable(),
  studentMobile: z.string().nullable(),
  parentEmail: z.string().nullable(),
  notes: z.string().nullable(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Types derived from the schemas
export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;
export type StudentWithGrade = Student & { grade: Grade | null };

// Updated type for single normalized preference
export type StudentPreference = z.infer<typeof studentPreferenceSchema>;

// Frontend-friendly format that matches the transformed data from server actions
export type StudentWithPreference = Student & {
  preference: {
    preferredSubjects: string[];
    preferredTeachers: string[];
    desiredTimes: { dayOfWeek: string; startTime: Date; endTime: Date }[];
    additionalNotes: string | null;
    classTypeId: string | null;
  } | null;
};

// Raw student type from database
export type Student = z.infer<typeof studentSchema>;

// Additional type for normalized structure from database
export type StudentWithNormalizedPreferences = Student & {
  StudentPreference: Array<{
    preferenceId: string;
    studentId: string;
    classTypeId: string | null;
    notes: string | null;
    teachers: Array<{
      id: string;
      studentPreferenceId: string;
      teacherId: string;
      teacher?: {
        teacherId: string;
        name: string;
      };
    }>;
    subjects: Array<{
      id: string;
      studentPreferenceId: string;
      subjectId: string;
      subject?: {
        subjectId: string;
        name: string;
      };
    }>;
    timeSlots: Array<{
      slotId: string;
      preferenceId: string;
      dayOfWeek: string;
      startTime: Date;
      endTime: Date;
    }>;
  }>;
};
