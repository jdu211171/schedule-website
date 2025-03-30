import { z } from "zod";

export const studentSubjectCreateSchema = z.object({
    studentId: z.string().min(1, { message: "Student ID is required" }),
    subjectId: z.string().min(1, { message: "Subject ID is required" }),
    notes: z.string().optional(),
});

export const studentSubjectUpdateSchema = studentSubjectCreateSchema.partial();

export type StudentSubjectCreateInput = z.infer<typeof studentSubjectCreateSchema>;
export type StudentSubjectUpdateInput = z.infer<typeof studentSubjectUpdateSchema>;