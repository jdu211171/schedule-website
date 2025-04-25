import { z } from "zod";

export const teacherSubjectCreateSchema = z.object({
    teacherId: z.string().min(1, { message: "教師IDは必須です" }),
    subjectId: z.string().min(1, { message: "科目IDは必須です" }),
    notes: z.string().optional(),
});

export const teacherSubjectUpdateSchema = z.object({
    teacherId: z.string().min(1, { message: "教師IDは必須です" }),
    subjectId: z.string().min(1, { message: "科目IDは必須です" }),
    notes: z.string().optional(),
});

export const teacherSubjectSchema = z.object({
    teacherId: z.string(),
    subjectId: z.string(),
    notes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type TeacherSubjectCreateInput = z.infer<typeof teacherSubjectCreateSchema>;
export type TeacherSubjectUpdateInput = z.infer<typeof teacherSubjectUpdateSchema>;
export type TeacherSubject = z.infer<typeof teacherSubjectSchema>;