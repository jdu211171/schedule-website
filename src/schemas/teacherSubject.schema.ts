import { z } from "zod";

export const teacherSubjectCreateSchema = z.object({
    teacherId: z.string().min(1, { message: "Teacher ID is required" }),
    subjectId: z.string().min(1, { message: "Subject ID is required" }),
    notes: z.string().optional(),
});

export const teacherSubjectUpdateSchema = teacherSubjectCreateSchema.partial();

export type TeacherSubjectCreateInput = z.infer<typeof teacherSubjectCreateSchema>;
export type TeacherSubjectUpdateInput = z.infer<typeof teacherSubjectUpdateSchema>;