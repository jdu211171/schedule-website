import { z } from "zod";

export const teacherCreateSchema = z.object({
    name: z.string().min(1, { message: "名前は必須です" }),
    evaluationId: z.string().nullable().optional(),
    birthDate: z.date().nullable().optional(),
    mobileNumber: z.string().max(20).nullable().optional(),
    email: z.string().email().optional(),
    highSchool: z.string().max(100).nullable().optional(),
    university: z.string().max(100).nullable().optional(),
    faculty: z.string().max(100).nullable().optional(),
    department: z.string().max(100).nullable().optional(),
    enrollmentStatus: z.string().max(50).nullable().optional(),
    otherUniversities: z.string().max(255).nullable().optional(),
    englishProficiency: z.string().max(50).nullable().optional(),
    toeic: z.number().int().nullable().optional(),
    toefl: z.number().int().nullable().optional(),
    mathCertification: z.string().max(50).nullable().optional(),
    kanjiCertification: z.string().max(50).nullable().optional(),
    otherCertifications: z.string().max(255).nullable().optional(),
    notes: z.string().optional(),

    username: z.string().min(1, { message: "ユーザー名は必須です" }),
    password: z.string().min(6, { message: "パスワードは6文字以上である必要があります" }),
});

export const teacherUpdateSchema = teacherCreateSchema.partial().extend({
    teacherId: z.string().cuid({ message: "無効なIDです" }), // Required for updates
});

export const teacherSchema = z.object({
    teacherId: z.string(),
    name: z.string(),
    evaluationId: z.string().nullable(),
    birthDate: z.date().nullable(),
    mobileNumber: z.string().nullable(),
    email: z.string().nullable(),
    highSchool: z.string().nullable(),
    university: z.string().nullable(),
    faculty: z.string().nullable(),
    department: z.string().nullable(),
    enrollmentStatus: z.string().nullable(),
    otherUniversities: z.string().nullable(),
    englishProficiency: z.string().nullable(),
    toeic: z.number().int().nullable(),
    toefl: z.number().int().nullable(),
    mathCertification: z.string().nullable(),
    kanjiCertification: z.string().nullable(),
    otherCertifications: z.string().nullable(),
    notes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type TeacherCreateInput = z.infer<typeof teacherCreateSchema>;
export type TeacherUpdateInput = z.infer<typeof teacherUpdateSchema>;
export type Teacher = z.infer<typeof teacherSchema>;