"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";
import { Teacher, Subject } from "@prisma/client";

// Define the return type to include subjects
type TeacherWithSubjects = Teacher & {
  teacherSubjects: {
    subject: Subject;
  }[];
};

interface GetTeachersParams {
  page?: number;
  pageSize?: number;
  studentId?: string;
}

export async function getTeachers({
  page = 1,
  pageSize = 10,
  studentId,
}: GetTeachersParams = {}): Promise<TeacherWithSubjects[]> {
  await requireAuth();

  // If no studentId is provided, fetch teachers with subjects and pagination
  if (!studentId) {
    const skip = (page - 1) * pageSize;
    return prisma.teacher.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        teacherSubjects: {
          include: {
            subject: true, // Include all subject fields
          },
        },
      },
    });
  }

  // Fetch the student's preferences
  const studentPreference = await prisma.studentRegularPreference.findFirst({
    where: { studentId },
  });

  // If no preferences exist, fallback to default fetching with subjects
  if (!studentPreference) {
    const skip = (page - 1) * pageSize;
    return prisma.teacher.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        teacherSubjects: {
          include: {
            subject: true,
          },
        },
      },
    });
  }

  const preferredTeachers = studentPreference.preferredTeachers || [];
  const preferredSubjects = studentPreference.preferredSubjects || [];

  // Fetch all teachers with their subjects
  const allTeachers = await prisma.teacher.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      teacherSubjects: {
        include: {
          subject: true,
        },
      },
    },
  });

  // Categorize teachers into three groups
  const preferredTeachersList: TeacherWithSubjects[] = [];
  const subjectPreferredTeachersList: TeacherWithSubjects[] = [];
  const otherTeachersList: TeacherWithSubjects[] = [];

  for (const teacher of allTeachers) {
    if (preferredTeachers.includes(teacher.teacherId)) {
      preferredTeachersList.push(teacher);
    } else if (
      teacher.teacherSubjects.some((ts) =>
        preferredSubjects.includes(ts.subject.subjectId)
      )
    ) {
      subjectPreferredTeachersList.push(teacher);
    } else {
      otherTeachersList.push(teacher);
    }
  }

  // Combine the lists in the specified order
  const sortedTeachers = [
    ...preferredTeachersList,
    ...subjectPreferredTeachersList,
    ...otherTeachersList,
  ];

  // Apply pagination to the sorted list
  const skip = (page - 1) * pageSize;
  const paginatedTeachers = sortedTeachers.slice(skip, skip + pageSize);

  return paginatedTeachers;
}
