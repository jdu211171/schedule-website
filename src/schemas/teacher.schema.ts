import { z } from "zod";

export const teacherCreateSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email().optional(),
    notes: z.string().optional(),
});

export const teacherUpdateSchema = teacherCreateSchema.partial().extend({
    teacherId: z.string().cuid({ message: "Invalid ID" }), // Required for updates
})

export type TeacherCreateInput = z.infer<typeof teacherCreateSchema>;
export type TeacherUpdateInput = z.infer<typeof teacherUpdateSchema>;