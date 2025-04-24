"use server";

import { prisma } from "@/lib/prisma";
import {
  Student,
  Grade,
  Subject,
  StudentRegularPreference,
} from "@prisma/client";
import { requireAuth } from "../auth-actions";

// Define the base type
type StudentWithDetails = Student & {
  grade: Grade | null;
  studentRegularPreferences: StudentRegularPreference[];
};

type StudentWithDetailsAndSubjects = Student & {
  grade: Grade | null;
  studentRegularPreferences: (StudentRegularPreference & {
    preferredSubjectsDetails: Subject[];
  })[];
};

interface GetStudentsParams {
  page?: number;
  pageSize?: number;
  teacherId?: string;
}

export async function getStudents({
  page = 1,
  pageSize = 10,
  teacherId,
}: GetStudentsParams = {}): Promise<StudentWithDetailsAndSubjects[]> {
  await requireAuth();

  let paginatedStudents: StudentWithDetails[];

  if (!teacherId) {
    const skip = (page - 1) * pageSize;
    paginatedStudents = await prisma.student.findMany({
      skip,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        grade: true,
        studentRegularPreferences: true,
      },
    });
  } else {
    // Fetch teacher's subject IDs
    let teacherSubjectIds = new Set<string>();
    try {
      const teacherSubjects = await prisma.teacherSubject.findMany({
        where: { teacherId: teacherId },
        select: { subjectId: true },
      });
      teacherSubjectIds = new Set(teacherSubjects.map((ts) => ts.subjectId));
    } catch (error) {
      console.error("Error fetching teacher subjects:", error);
      return [];
    }

    // Fetch all students
    let allStudents: StudentWithDetails[] = [];
    try {
      allStudents = await prisma.student.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          grade: true,
          studentRegularPreferences: true,
        },
      });
    } catch (error) {
      console.error("Error fetching all students:", error);
      return [];
    }

    // Sort students
    const preferredTeacherStudents: StudentWithDetails[] = [];
    const subjectMatchStudents: StudentWithDetails[] = [];
    const otherStudents: StudentWithDetails[] = [];

    for (const student of allStudents) {
      const preferences = student.studentRegularPreferences;
      let isPreferredTeacher = false;
      let hasSubjectMatch = false;

      if (preferences && preferences.length > 0) {
        for (const pref of preferences) {
          if (pref.preferredTeachers?.includes(teacherId)) {
            isPreferredTeacher = true;
            break;
          }
          if (
            !isPreferredTeacher &&
            pref.preferredSubjects &&
            pref.preferredSubjects.length > 0
          ) {
            hasSubjectMatch = pref.preferredSubjects.some((subId) =>
              teacherSubjectIds.has(subId)
            );
          }
        }
      }

      if (isPreferredTeacher) {
        preferredTeacherStudents.push(student);
      } else if (hasSubjectMatch) {
        subjectMatchStudents.push(student);
      } else {
        otherStudents.push(student);
      }
    }

    const sortedStudents = [
      ...preferredTeacherStudents,
      ...subjectMatchStudents,
      ...otherStudents,
    ];

    const skip = (page - 1) * pageSize;
    paginatedStudents = sortedStudents.slice(skip, skip + pageSize);
  }

  // Fetch subject details for all preferred subjects in paginated students
  const subjectIdsSet = new Set<string>();
  for (const student of paginatedStudents) {
    student.studentRegularPreferences.forEach((pref) =>
      pref.preferredSubjects.forEach((id) => subjectIdsSet.add(id))
    );
  }
  const subjectIds = Array.from(subjectIdsSet);

  const subjects = await prisma.subject.findMany({
    where: { subjectId: { in: subjectIds } },
  });

  const subjectMap = new Map<string, Subject>();
  subjects.forEach((subject) => subjectMap.set(subject.subjectId, subject));

  // Attach subject details to each student's preference
  const studentsWithSubjects: StudentWithDetailsAndSubjects[] =
    paginatedStudents.map((student) => {
      const enrichedPrefs = student.studentRegularPreferences.map((pref) => ({
        ...pref,
        preferredSubjectsDetails: pref.preferredSubjects
          .map((id) => subjectMap.get(id))
          .filter((s): s is Subject => !!s),
      }));
      return { ...student, studentRegularPreferences: enrichedPrefs };
    });

  return studentsWithSubjects;
}
