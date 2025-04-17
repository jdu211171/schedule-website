export type SubjectId = 'math' | 'physics' | 'english' | 'chemistry' | 'history' | 'biology' | 'japanese' | 'informatics';

export type SubjectInfo = {
  id: SubjectId;
  name: string;
  color: string;
};

export const SUBJECTS: Record<SubjectId, SubjectInfo> = {
  math: {
    id: 'math',
    name: '数学',
    color: 'bg-blue-500 border-blue-600'
  },
  physics: {
    id: 'physics',
    name: '物理学',
    color: 'bg-green-500 border-green-600'
  },
  english: {
    id: 'english',
    name: '英語',
    color: 'bg-purple-500 border-purple-600'
  },
  chemistry: {
    id: 'chemistry',
    name: '化学',
    color: 'bg-red-500 border-red-600'
  },
  history: {
    id: 'history',
    name: '歴史',
    color: 'bg-yellow-500 border-yellow-600'
  },
  biology: {
    id: 'biology',
    name: '生物学',
    color: 'bg-pink-500 border-pink-600'
  },
  japanese: {
    id: 'japanese',
    name: '国語',
    color: 'bg-orange-500 border-orange-600'
  },
  informatics: {
    id: 'informatics',
    name: '情報科学',
    color: 'bg-indigo-500 border-indigo-600'
  }
};

export const SUBJECTS_LIST = Object.values(SUBJECTS);

export const getSubjectColor = (subjectId: SubjectId | string): string => {
  return (SUBJECTS[subjectId as SubjectId]?.color) || 'bg-gray-400 border-gray-500';
};

export type TeacherId = '1' | '2' | '3' | '4';
export type StudentId = '1' | '2' | '3' | '4';

export const TEACHERS: Record<TeacherId, { id: TeacherId, name: string }> = {
  '1': { id: '1', name: '佐藤 先生' },
  '2': { id: '2', name: '田中 先生' },
  '3': { id: '3', name: '鈴木 先生' },
  '4': { id: '4', name: '山田 先生' }
};

export const STUDENTS: Record<StudentId, { id: StudentId, name: string }> = {
  '1': { id: '1', name: '中村さん' },
  '2': { id: '2', name: '小林さん' },
  '3': { id: '3', name: '加藤さん' },
  '4': { id: '4', name: '伊藤さん' }
};

export const TEACHERS_LIST = Object.values(TEACHERS);
export const STUDENTS_LIST = Object.values(STUDENTS);

export const getTeacherName = (teacherId: TeacherId | string): string => {
  return TEACHERS[teacherId as TeacherId]?.name || '';
};

export const getStudentName = (studentId: StudentId | string): string => {
  return STUDENTS[studentId as StudentId]?.name || '';
};

export const getSubjectName = (subjectId: SubjectId | string): string => {
  return SUBJECTS[subjectId as SubjectId]?.name || '';
};