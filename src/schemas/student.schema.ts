import { z } from "zod";

// Match the enum types in the Prisma schema
const SchoolTypeEnum = z.enum(['PUBLIC', 'PRIIVATE']);
const ExamSchoolTypeEnum = z.enum(['ELEMENTARY', 'MIDDLE', 'HIGH', 'UNIVERSITY', 'OTHER']);

export const studentCreateSchema = z.object({
    studentId: z.string().cuid({ message: "Invalid ID" }).optional(), // Changed from uuid to cuid to match Prisma
    name: z.string().max(100),
    kanaName: z.string().max(100).nullable(),
    gradeId: z.string().max(50).nullable(),
    schoolName: z.string().max(100).nullable(),
    schoolType: SchoolTypeEnum.nullable(), // Changed to enum
    examSchoolType: SchoolTypeEnum.nullable(), // Added to match Prisma
    examSchoolCategoryType: ExamSchoolTypeEnum.nullable(), // Added to match Prisma
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
