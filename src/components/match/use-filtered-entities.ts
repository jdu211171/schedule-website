import { useMemo } from 'react';
import { Student, Subject, Teacher, TeacherSubject } from '@/components/match/types';

interface EnrichedStudent extends Student {
  preference?: {
    preferredSubjects: string[];
    preferredTeachers: string[];
  } | null;
}

interface EnrichedTeacher extends Teacher {
  teacherSubjects?: TeacherSubject[];
}

export function useFilteredTeachers(
  teachers: EnrichedTeacher[],
  selectedStudentId: string | null,
  students: EnrichedStudent[],
  subjects: Subject[],
  teacherSubjects: TeacherSubject[]
) {
  return useMemo(() => {
    if (!selectedStudentId) {
      return { filteredTeachers: teachers, kibouSubjects: [] };
    }

    const selectedStudent = students.find(student => student.studentId === selectedStudentId);
    
    if (!selectedStudent || !selectedStudent.preference) {
      return { filteredTeachers: teachers, kibouSubjects: [] };
    }

    const preferredSubjectIds = selectedStudent.preference.preferredSubjects || [];
    const preferredTeacherIds = selectedStudent.preference.preferredTeachers || [];
    
    const teacherSubjectsMap: Record<string, string[]> = {};
    teacherSubjects.forEach(ts => {
      if (!teacherSubjectsMap[ts.teacherId]) {
        teacherSubjectsMap[ts.teacherId] = [];
      }
      teacherSubjectsMap[ts.teacherId].push(ts.subjectId);
    });
    
    if (preferredTeacherIds.length > 0) {
      const filteredByPreferredTeachers = teachers.filter(teacher => 
        preferredTeacherIds.includes(teacher.teacherId)
      );
      
      if (filteredByPreferredTeachers.length > 0) {
        const kibouSubjectsList = preferredSubjectIds
          .map(subjectId => subjects.find(s => s.subjectId === subjectId))
          .filter((subject): subject is Subject => !!subject);
        
        return { 
          filteredTeachers: filteredByPreferredTeachers, 
          kibouSubjects: kibouSubjectsList
        };
      }
    }

    if (preferredSubjectIds.length > 0) {
      const filteredTeachers = teachers.filter(teacher => {
        const teacherSubjectIds = teacherSubjectsMap[teacher.teacherId] || [];
        return teacherSubjectIds.some(subjectId => preferredSubjectIds.includes(subjectId));
      });

      const sortedTeachers = [...filteredTeachers].sort((a, b) => {
        const aIsPreferred = preferredTeacherIds.includes(a.teacherId) ? 1 : 0;
        const bIsPreferred = preferredTeacherIds.includes(b.teacherId) ? 1 : 0;
        
        if (aIsPreferred !== bIsPreferred) {
          return bIsPreferred - aIsPreferred;
        }
        
        const aMatches = countMatchingSubjects(a.teacherId, preferredSubjectIds, teacherSubjectsMap);
        const bMatches = countMatchingSubjects(b.teacherId, preferredSubjectIds, teacherSubjectsMap);
        return bMatches - aMatches;
      });
      
      const kibouSubjectsList = preferredSubjectIds
        .map(subjectId => subjects.find(s => s.subjectId === subjectId))
        .filter((subject): subject is Subject => !!subject);
      
      return { 
        filteredTeachers: sortedTeachers, 
        kibouSubjects: kibouSubjectsList
      };
    }
    
    return { filteredTeachers: teachers, kibouSubjects: [] };
  }, [teachers, selectedStudentId, students, subjects, teacherSubjects]);
}

export function useFilteredStudents(
  students: EnrichedStudent[],
  selectedTeacherId: string | null,
  teachers: EnrichedTeacher[],
  subjects: Subject[],
  teacherSubjects: TeacherSubject[]
) {
  return useMemo(() => {
    if (!selectedTeacherId) {
      return { filteredStudents: students, kibouSubjects: [] };
    }

    const teacherSubjectIds = teacherSubjects
      .filter(ts => ts.teacherId === selectedTeacherId)
      .map(ts => ts.subjectId);
    
    if (teacherSubjectIds.length === 0) {
      return { filteredStudents: students, kibouSubjects: [] };
    }
    
    // Фильтруем учеников
    const filteredStudents = students.filter(student => {
      if (!student.preference) return false;
      
      if (student.preference.preferredTeachers.includes(selectedTeacherId)) {
        return true;
      }
      
      return student.preference.preferredSubjects.some(subjectId => 
        teacherSubjectIds.includes(subjectId)
      );
    });
    
    // Сортировка результатов
    const sortedStudents = [...filteredStudents].sort((a, b) => {
      if (!a.preference || !b.preference) return 0;
      
      const aPreferredTeacher = a.preference.preferredTeachers.includes(selectedTeacherId) ? 1 : 0;
      const bPreferredTeacher = b.preference.preferredTeachers.includes(selectedTeacherId) ? 1 : 0;
      
      if (aPreferredTeacher !== bPreferredTeacher) {
        return bPreferredTeacher - aPreferredTeacher;
      }
      
      const aMatches = countStudentMatchingSubjects(a, teacherSubjectIds);
      const bMatches = countStudentMatchingSubjects(b, teacherSubjectIds);
      return bMatches - aMatches;
    });
    
    const kibouSubjectsList = teacherSubjectIds
      .map(subjectId => subjects.find(s => s.subjectId === subjectId))
      .filter((subject): subject is Subject => !!subject);
    
    return { 
      filteredStudents: sortedStudents, 
      kibouSubjects: kibouSubjectsList
    };
  }, [students, selectedTeacherId, subjects, teacherSubjects]); // Удалена лишняя зависимость 'teachers'
}

function countMatchingSubjects(
  teacherId: string, 
  preferredSubjectIds: string[],
  teacherSubjectsMap: Record<string, string[]>
): number {
  const teacherSubjectIds = teacherSubjectsMap[teacherId] || [];
  
  return preferredSubjectIds.filter(subjectId => 
    teacherSubjectIds.includes(subjectId)
  ).length;
}

function countStudentMatchingSubjects(
  student: EnrichedStudent, 
  teacherSubjectIds: string[]
): number {
  if (!student.preference) {
    return 0;
  }
  
  const studentSubjectIds = student.preference.preferredSubjects;
  
  return studentSubjectIds.filter(subjectId => 
    teacherSubjectIds.includes(subjectId)
  ).length;
}