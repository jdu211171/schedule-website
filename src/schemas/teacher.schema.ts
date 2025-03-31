import { z } from "zod";

export const teacherCreateSchema = z.object({
    teacherId: z.string().min(1, { message: "Teacher ID is required" }),
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email().optional(),
    notes: z.string().optional(),
});

export const teacherUpdateSchema = teacherCreateSchema.partial();

export type TeacherCreateInput = z.infer<typeof teacherCreateSchema>;
export type TeacherUpdateInput = z.infer<typeof teacherUpdateSchema>;