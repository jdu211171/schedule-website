import { z } from "zod";

export const studentCreateSchema = z.object({
    studentId: z.string().uuid({ message: "Invalid ID" }),
    name: z.string().max(100),
    kanaName: z.string().max(100).nullable(),
    gradeId: z.string().max(50).nullable(),
    schoolName: z.string().max(100).nullable(),
    schoolType: z.string().max(20).nullable(),
    examCategory: z.string().max(50).nullable(),
    firstChoiceSchool: z.string().max(100).nullable(),
    secondChoiceSchool: z.string().max(100).nullable(),
    enrollmentDate: z.date().nullable(),
    birthDate: z.date().nullable(),
    homePhone: z.string().max(20).nullable(),
    parentMobile: z.string().max(20).nullable(),
    studentMobile: z.string().max(20).nullable(),
    parentEmail: z.string().max(100).nullable(),
    notes: z.string().nullable(),
});

export const studentUpdateSchema = studentCreateSchema.partial().extend({
    studentId: z.string().uuid({ message: "Invalid ID" }),
});

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;

