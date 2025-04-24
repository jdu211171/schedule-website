import { z } from "zod";
import { Grade } from "@prisma/client";
import { desiredTimeSchema, DesiredTimeInput } from "./desiredTime.schema";

const ExamSchoolTypeEnum = z.enum(["ELEMENTARY", "MIDDLE", "HIGH", "UNIVERSITY", "OTHER"]);

export const studentCreateSchema = z.object({
    name: z.string().max(100),
    kanaName: z.string().max(100).nullable(),
    gradeId: z.string().max(50).nullable(),
    schoolName: z.string().max(100).nullable(),
    schoolType: z.enum(["PUBLIC", "PRIVATE"]).optional(),
    examSchoolType: z.enum(["PUBLIC", "PRIVATE"]).optional(),
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
    userId: z.string().nullable().optional(),
});

export const studentUpdateSchema = studentCreateSchema.partial().extend({
    studentId: z.string().cuid({ message: "Invalid ID" }),
});

// Update student preferences schema to include desiredTimes
export const studentPreferenceSchema = z.object({
    studentId: z.string(),
    preferredSubjects: z.array(z.string()),
    preferredTeachers: z.array(z.string()),
    preferredWeekdays: z.array(z.string()),
    preferredHours: z.array(z.string()),
    desiredTimes: z.array(desiredTimeSchema).default([]), // new
    additionalNotes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const studentSchema = z.object({
    studentId: z.string(),
    name: z.string(),
    kanaName: z.string().nullable(),
    gradeId: z.string().nullable(),
    schoolName: z.string().nullable(),
    schoolType: z.enum(["PUBLIC", "PRIVATE"]).nullable(),
    examSchoolType: z.enum(["PUBLIC", "PRIVATE"]).nullable(),
    examSchoolCategoryType: ExamSchoolTypeEnum.nullable(),
    firstChoiceSchool: z.string().nullable(),
    secondChoiceSchool: z.string().nullable(),
    enrollmentDate: z.date().nullable(),
    birthDate: z.date().nullable(),
    homePhone: z.string().nullable(),
    parentMobile: z.string().nullable(),
    studentMobile: z.string().nullable(),
    parentEmail: z.string().nullable(),
    notes: z.string().nullable(),
    userId: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;
export type StudentWithGrade = Student & { 
    grade: Grade | null,
    preference?: { // Added preference type for StudentWithGrade
        preferredSubjects: string[];
        preferredTeachers: string[];
        preferredWeekdays: string[];
        preferredHours: string[];
        desiredTimes: DesiredTimeInput[]; // new
        additionalNotes: string | null;
    } | null
};
export type StudentPreference = z.infer<typeof studentPreferenceSchema>;
export type StudentWithPreference = Student & {
    preference: {
        preferredSubjects: string[];
        preferredTeachers: string[];
        preferredWeekdays: string[];
        preferredHours: string[];
        desiredTimes: DesiredTimeInput[]; // new
        additionalNotes: string | null;
    } | null
};
export type Student = z.infer<typeof studentSchema>;