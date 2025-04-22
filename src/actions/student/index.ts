"use server";

import { prisma } from "@/lib/prisma";
import { Student, StudentPreference, Grade, Subject } from "@prisma/client";
import { requireAuth } from "../auth-actions";

// Define the base type
type StudentWithDetails = Student & {
  grade: Grade | null;
  preference: StudentPreference | null;
};

// Define the return type with subject details
type StudentWithDetailsAndSubjects = Student & {
  grade: Grade | null;
  preference: (StudentPreference & {
    preferredSubjectsDetails: Subject[];
  }) | null;
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
        createdAt: 'desc',
      },
      include: {
        grade: true,
        preference: true,
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
      teacherSubjectIds = new Set(teacherSubjects.map(ts => ts.subjectId));
    } catch (error) {
      console.error("Error fetching teacher subjects:", error);
      return [];
    }

    // Fetch all students
    let allStudents: StudentWithDetails[] = [];
    try {
      allStudents = await prisma.student.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          grade: true,
          preference: true,
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
      const preference = student.preference;
      let isPreferredTeacher = false;
      let hasSubjectMatch = false;

      if (preference) {
        if (preference.preferredTeachers?.includes(teacherId)) {
          isPreferredTeacher = true;
        }
        if (!isPreferredTeacher && preference.preferredSubjects && preference.preferredSubjects.length > 0) {
          hasSubjectMatch = preference.preferredSubjects.some(subId => teacherSubjectIds.has(subId));
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
    if (student.preference?.preferredSubjects) {
      student.preference.preferredSubjects.forEach(subId => subjectIdsSet.add(subId));
    }
  }
  const subjectIds = Array.from(subjectIdsSet);

  const subjects = await prisma.subject.findMany({
    where: { subjectId: { in: subjectIds } },
  });

  const subjectMap = new Map<string, Subject>();
  subjects.forEach(subject => subjectMap.set(subject.subjectId, subject));

  // Attach subject details to each student's preference
  const studentsWithSubjects: StudentWithDetailsAndSubjects[] = paginatedStudents.map(student => {
    if (student.preference) {
      const preferredSubjectsDetails = student.preference.preferredSubjects
        .map(subId => subjectMap.get(subId))
        .filter((sub): sub is Subject => sub !== undefined);
      return {
        ...student,
        preference: {
          ...student.preference,
          preferredSubjectsDetails,
        },
      };
    }
    return { ...student, preference: null };
  });

  return studentsWithSubjects;
}
