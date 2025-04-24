import { z } from "zod"
import { desiredTimeSchema } from "./desiredTime.schema"

export const teacherSubjectCreateSchema = z.object({
    teacherId: z.string().min(1, { message: "Teacher ID is required" }),
    subjectId: z.string().min(1, { message: "Subject ID is required" }),
    notes: z.string().optional(),
    desiredTimes: z.array(desiredTimeSchema).optional().default([]),
});

export const teacherSubjectUpdateSchema = z.object({
    teacherId: z.string().min(1, { message: "Teacher ID is required" }),
    subjectId: z.string().min(1, { message: "Subject ID is required" }),
    notes: z.string().optional(),
    desiredTimes: z.array(desiredTimeSchema).optional().default([]),
});

export const teacherSubjectSchema = z.object({
    teacherId: z.string(),
    subjectId: z.string(),
    notes: z.string().nullable(),
    desiredTimes: z.array(desiredTimeSchema).optional().default([]),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type TeacherSubjectCreateInput = z.infer<typeof teacherSubjectCreateSchema>;
export type TeacherSubjectUpdateInput = z.infer<typeof teacherSubjectUpdateSchema>;
export type TeacherSubject = z.infer<typeof teacherSubjectSchema>;