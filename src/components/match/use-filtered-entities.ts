import { useMemo } from "react";

import { StudentWithPreference } from "@/schemas/student.schema";
import { Teacher } from "@/schemas/teacher.schema";
import { Subject } from "@/schemas/subject.schema";
import { TeacherSubject } from "@/schemas/teacherSubject.schema";

/* --------------------------------------------------------------------------
 * Utility helpers
 * -------------------------------------------------------------------------- */

/**
 * Collect all <Subject> objects a teacher can teach based solely on the
 * `teacherSubjects` join‑table. We do **not** look at historic lessons – this
 * mirrors the behaviour elsewhere in the UI where only the explicitly declared
 * “講師対応科目” are shown.
 */
function getSubjectsForTeacher(
  teacherId: string,
  teacherSubjects: TeacherSubject[],
  subjects: Subject[]
): Subject[] {
  const subjectIds = new Set(
    teacherSubjects
      .filter((ts) => ts.teacherId === teacherId)
      .map((ts) => ts.subjectId)
  );
  return subjects.filter((s) => subjectIds.has(s.subjectId));
}

/**
 * Convert a list of subjectId strings found in a student preference record to
 * the corresponding <Subject> objects.
 */
function getPreferredSubjectsForStudent(
  student: StudentWithPreference,
  subjects: Subject[]
): Subject[] {
  if (!student.preference) return [];
  const { preferredSubjects } = student.preference;
  const idSet = new Set(preferredSubjects);
  return subjects.filter((s) => idSet.has(s.subjectId));
}

/* --------------------------------------------------------------------------
 * Public hooks
 * -------------------------------------------------------------------------- */

/**
 * When the **student** is chosen first, return an ordered list of teachers and
 * a list of subjects the student hopes to study (used for UI highlighting).
 */
export function useFilteredTeachers(
  teachers: Teacher[],
  selectedStudentId: string | null,
  students: StudentWithPreference[],
  subjects: Subject[],
  teacherSubjects: TeacherSubject[]
): { filteredTeachers: Teacher[]; kibouSubjects: Subject[] } {
  return useMemo(() => {
    // No student selected – return original list untouched
    if (!selectedStudentId) {
      return { filteredTeachers: teachers, kibouSubjects: [] };
    }

    const student = students.find((s) => s.studentId === selectedStudentId);
    if (!student) {
      return { filteredTeachers: teachers, kibouSubjects: [] };
    }

    const preferredTeachers = new Set(
      student.preference?.preferredTeachers ?? []
    );
    const preferredSubjectIds = new Set(
      student.preference?.preferredSubjects ?? []
    );

    // Pre‑compute subjects for each teacher once so we can test fast.
    const teacherSubjectMap: Record<string, Subject[]> = {};
    teachers.forEach((t) => {
      teacherSubjectMap[t.teacherId] = getSubjectsForTeacher(
        t.teacherId,
        teacherSubjects,
        subjects
      );
    });

    // Ranking: 0 = teacher explicitly preferred, 1 = any subject match, 2 = rest
    const rankedTeachers = [...teachers].sort((a, b) => {
      const rankOf = (t: Teacher) => {
        if (preferredTeachers.has(t.teacherId)) return 0;
        const teachesPreferredSubject = teacherSubjectMap[t.teacherId].some(
          (subj) => preferredSubjectIds.has(subj.subjectId)
        );
        if (teachesPreferredSubject) return 1;
        return 2;
      };
      return rankOf(a) - rankOf(b);
    });

    const kibouSubjects = getPreferredSubjectsForStudent(student, subjects);

    return {
      filteredTeachers: rankedTeachers,
      kibouSubjects,
    };
  }, [teachers, selectedStudentId, students, subjects, teacherSubjects]);
}

/**
 * When the **teacher** is chosen first, return an ordered list of students and
 * a list of subjects that teacher can teach (used for UI highlighting).
 */
export function useFilteredStudents(
  students: StudentWithPreference[],
  selectedTeacherId: string | null,
  teachers: Teacher[],
  subjects: Subject[],
  teacherSubjects: TeacherSubject[]
): { filteredStudents: StudentWithPreference[]; kibouSubjects: Subject[] } {
  return useMemo(() => {
    // No teacher selected – return original list untouched
    if (!selectedTeacherId) {
      return { filteredStudents: students, kibouSubjects: [] };
    }

    const teacher = teachers.find((t) => t.teacherId === selectedTeacherId);
    if (!teacher) {
      return { filteredStudents: students, kibouSubjects: [] };
    }

    const teacherSubjectList = getSubjectsForTeacher(
      selectedTeacherId,
      teacherSubjects,
      subjects
    );
    const teacherSubjectIds = new Set(
      teacherSubjectList.map((s) => s.subjectId)
    );

    // Ranking: 0 = student explicitly prefers this teacher, 1 = prefers a subject this teacher teaches, 2 = rest
    const rankedStudents = [...students].sort((a, b) => {
      const rankOf = (s: StudentWithPreference) => {
        if (s.preference?.preferredTeachers?.includes(selectedTeacherId)) {
          return 0;
        }
        const prefersTeacherSubject = (
          s.preference?.preferredSubjects ?? []
        ).some((sid) => teacherSubjectIds.has(sid));
        return prefersTeacherSubject ? 1 : 2;
      };
      return rankOf(a) - rankOf(b);
    });

    return {
      filteredStudents: rankedStudents,
      kibouSubjects: teacherSubjectList,
    };
  }, [students, selectedTeacherId, teachers, subjects, teacherSubjects]);
}
