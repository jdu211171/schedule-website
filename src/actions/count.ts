"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "./auth-actions";

export async function getBoothsCount() {
    await requireAuth();
    return prisma.booth.count();
}

export async function getClassTypesCount() {
    await requireAuth();
    return prisma.classType.count();
}

export async function getEvaluationsCount() {
    await requireAuth();
    return prisma.evaluation.count();
}

export async function getGradesCount() {
    await requireAuth();
    return prisma.grade.count();
}

export async function getStudentsCount() {
    await requireAuth();
    return prisma.student.count();
}

export async function getSubjectsCount() {
    await requireAuth();
    return prisma.subject.count();
}

export async function getSubjectTypesCount() {
    await requireAuth();
    return prisma.subjectType.count();
}

export async function getTeachersCount() {
    await requireAuth();
    return prisma.teacher.count();
}

export async function getTeacherSubjectsCount() {
    await requireAuth();
    return prisma.teacherSubject.count();
}

export async function getStudentTypesCount() {
    await requireAuth();
    return prisma.studentType.count();
}
