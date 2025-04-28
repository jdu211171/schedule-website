import { z } from "zod";
import { dayOfWeekEnum } from "./teacher-preferences.schema";

export const teacherCreateSchema = z.object({
  name: z.string().min(1, { message: "名前は必須です" }),
  evaluationId: z.string().min(1, { message: "評価IDは必須です" }),
  birthDate: z.date(),
  mobileNumber: z.string().max(20),
  email: z
    .string()
    .email({ message: "有効なメールアドレスを入力してください" }),
  highSchool: z.string().max(100),
  university: z.string().max(100),
  faculty: z.string().max(100),
  department: z.string().max(100),
  enrollmentStatus: z.string().max(50),
  otherUniversities: z.string().max(255).nullable().optional(),
  englishProficiency: z.string().max(50).nullable().optional(),
  toeic: z.number().int().nullable().optional(),
  toefl: z.number().int().nullable().optional(),
  mathCertification: z.string().max(50).nullable().optional(),
  kanjiCertification: z.string().max(50).nullable().optional(),
  otherCertifications: z.string().max(255).nullable().optional(),
  notes: z.string().max(255).nullable().optional(),

  username: z.string().min(1, { message: "ユーザー名は必須です" }),
  password: z
    .string()
    .min(6, { message: "パスワードは6文字以上である必要があります" }),
});

export const teacherUpdateSchema = teacherCreateSchema.partial().extend({
  teacherId: z.string().cuid({ message: "無効な ID です" }),
});

export const teacherShiftSchema = z.object({
  shiftId: z.string().optional(),
  teacherId: z.string(),
  dayOfWeek: dayOfWeekEnum,
  startTime: z.date(),
  endTime: z.date(),
  notes: z.string().nullable().optional(),
});

export const teacherSchema = z.object({
  teacherId: z.string(),
  name: z.string(),
  evaluationId: z.string(),
  birthDate: z.date(),
  mobileNumber: z.string(),
  email: z.string(),
  highSchool: z.string(),
  university: z.string(),
  faculty: z.string(),
  department: z.string(),
  enrollmentStatus: z.string(),
  otherUniversities: z.string().nullable(),
  englishProficiency: z.string().nullable(),
  toeic: z.number().int().nullable(),
  toefl: z.number().int().nullable(),
  mathCertification: z.string().nullable(),
  kanjiCertification: z.string().nullable(),
  otherCertifications: z.string().nullable(),
  notes: z.string().nullable(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TeacherCreateInput = z.infer<typeof teacherCreateSchema>;
export type TeacherUpdateInput = z.infer<typeof teacherUpdateSchema>;
export type Teacher = z.infer<typeof teacherSchema>;
export type TeacherWithPreference = Teacher & {
  preference: {
    desiredTimes: { dayOfWeek: string; startTime: string; endTime: string }[];
    additionalNotes: string | null;
  } | null;
};
