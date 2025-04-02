import { z } from "zod";

// Match the enum types in the Prisma schema
const ExamSchoolTypeEnum = z.enum(['ELEMENTARY', 'MIDDLE', 'HIGH', 'UNIVERSITY', 'OTHER']);

export const studentCreateSchema = z.object({
    studentId: z.string().cuid({ message: "Invalid ID" }).optional(),
    name: z.string().max(100),
    kanaName: z.string().max(100).nullable(),
    gradeId: z.string().max(50).nullable(),
    schoolName: z.string().max(100).nullable(),
    // SchoolType enum in Prisma (PUBLIC/PRIVATE)
    schoolType: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    // Also uses SchoolType enum in Prisma (PUBLIC/PRIVATE)
    examSchoolType: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    // Uses examSchoolType enum in Prisma (ELEMENTARY/MIDDLE/HIGH/UNIVERSITY/OTHER)
    examSchoolCategoryType: ExamSchoolTypeEnum.nullable(),
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
    studentId: z.string().cuid({ message: "Invalid ID" }), // Must provide ID for updates
});

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;
