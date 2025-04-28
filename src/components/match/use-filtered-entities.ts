/* --------------------------------------------------------------------------
 *  use-filtered-entities.ts
 *  共通フック:
 *    1. useFilteredTeachers … 生徒選択時に教師を優先順位で並べ替え
 *    2. useFilteredStudents … 教師選択時に生徒を優先順位で並べ替え
 *
 *  優先順位 (要件どおり):
 *  ───────────────────────────────────────────────────────────
 *  【教師リスト】
 *    ① 生徒が “希望教師” として登録している教師
 *    ② 生徒が “希望科目” として登録している科目を担当できる教師
 *    ③ その他の教師
 *
 *  【生徒リスト】
 *    ① 教師を “希望教師” に登録している生徒
 *    ② 教師が担当できる科目を “希望科目” に含む生徒
 *    ③ その他の生徒
 * ------------------------------------------------------------------------ */

import { useMemo } from "react";
import { Teacher } from "@/schemas/teacher.schema";
import { Subject } from "@/schemas/subject.schema";
import { TeacherSubject } from "@/schemas/teacherSubject.schema";
import { StudentWithPreference } from "@/schemas/student.schema";

/* ───────────────────────────────────────────────────────────
 * 生徒を選択したときに表示する教師リスト
 * ─────────────────────────────────────────────────────────── */
export function useFilteredTeachers(
  teachers: Teacher[],
  selectedStudentId: string | null,
  students: StudentWithPreference[],
  subjects: Subject[],
  teacherSubjects: TeacherSubject[]
): { filteredTeachers: Teacher[]; kibouSubjects: Subject[] } {
  const { filteredTeachers, kibouSubjects } = useMemo(() => {
    /* 生徒が未選択の場合はそのまま返す */
    if (!selectedStudentId) {
      return { filteredTeachers: teachers, kibouSubjects: [] as Subject[] };
    }

    /* 対象生徒を取得 */
    const student = students.find((s) => s.studentId === selectedStudentId);
    if (!student || !student.preference) {
      return { filteredTeachers: teachers, kibouSubjects: [] as Subject[] };
    }

    const preferredTeacherIds = student.preference.preferredTeachers ?? [];
    const preferredSubjectIds = student.preference.preferredSubjects ?? [];

    /* 先生が希望科目を担当しているか判定 */
    const teacherHasPreferredSubject = (teacherId: string) =>
      teacherSubjects.some(
        (ts) =>
          ts.teacherId === teacherId &&
          preferredSubjectIds.includes(ts.subjectId)
      );

    const priority1: Teacher[] = [];
    const priority2: Teacher[] = [];
    const priority3: Teacher[] = [];

    teachers.forEach((teacher) => {
      if (preferredTeacherIds.includes(teacher.teacherId)) {
        priority1.push(teacher);
      } else if (teacherHasPreferredSubject(teacher.teacherId)) {
        priority2.push(teacher);
      } else {
        priority3.push(teacher);
      }
    });

    const kibouSubjects = subjects.filter((subj) =>
      preferredSubjectIds.includes(subj.subjectId)
    );

    return {
      filteredTeachers: [...priority1, ...priority2, ...priority3],
      kibouSubjects,
    };
  }, [teachers, selectedStudentId, students, subjects, teacherSubjects]);

  return { filteredTeachers, kibouSubjects };
}

/* ───────────────────────────────────────────────────────────
 * 教師を選択したときに表示する生徒リスト
 * ─────────────────────────────────────────────────────────── */
export function useFilteredStudents(
  students: StudentWithPreference[],
  selectedTeacherId: string | null,
  _teachers: Teacher[], // 使わないが署名互換のため残す
  subjects: Subject[],
  teacherSubjects: TeacherSubject[]
): { filteredStudents: StudentWithPreference[]; kibouSubjects: Subject[] } {
  const { filteredStudents, kibouSubjects } = useMemo(() => {
    /* 教師が未選択の場合はそのまま返す */
    if (!selectedTeacherId) {
      return { filteredStudents: students, kibouSubjects: [] as Subject[] };
    }

    /* 先生が担当できる科目一覧 */
    const teacherSubjectIds = teacherSubjects
      .filter((ts) => ts.teacherId === selectedTeacherId)
      .map((ts) => ts.subjectId);

    const priority1: StudentWithPreference[] = [];
    const priority2: StudentWithPreference[] = [];
    const priority3: StudentWithPreference[] = [];

    students.forEach((student) => {
      const prefersThisTeacher =
        student.preference?.preferredTeachers?.includes(selectedTeacherId) ??
        false;

      const subjectOverlap =
        student.preference?.preferredSubjects?.some((sid) =>
          teacherSubjectIds.includes(sid)
        ) ?? false;

      if (prefersThisTeacher) {
        priority1.push(student);
      } else if (subjectOverlap) {
        priority2.push(student);
      } else {
        priority3.push(student);
      }
    });

    const kibouSubjects = subjects.filter((subj) =>
      teacherSubjectIds.includes(subj.subjectId)
    );

    return {
      filteredStudents: [...priority1, ...priority2, ...priority3],
      kibouSubjects,
    };
  }, [students, selectedTeacherId, subjects, teacherSubjects]);

  return { filteredStudents, kibouSubjects };
}
