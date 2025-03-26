// Типы для предметов и их данных
export type SubjectId = 'math' | 'physics' | 'english' | 'chemistry' | 'history' | 'biology' | 'japanese' | 'informatics';

export type SubjectInfo = {
  id: SubjectId;
  name: string;
  color: string;
};

// Карта предметов с их цветами
export const SUBJECTS: Record<SubjectId, SubjectInfo> = {
  math: {
    id: 'math',
    name: '数学',
    color: 'bg-blue-100 border-blue-300'
  },
  physics: {
    id: 'physics',
    name: '物理学',
    color: 'bg-green-100 border-green-300'
  },
  english: {
    id: 'english',
    name: '英語',
    color: 'bg-purple-100 border-purple-300'
  },
  chemistry: {
    id: 'chemistry',
    name: '化学',
    color: 'bg-red-100 border-red-300'
  },
  history: {
    id: 'history',
    name: '歴史',
    color: 'bg-yellow-100 border-yellow-300'
  },
  biology: {
    id: 'biology',
    name: '生物学',
    color: 'bg-pink-100 border-pink-300'
  },
  japanese: {
    id: 'japanese',
    name: '国語',
    color: 'bg-orange-100 border-orange-300'
  },
  informatics: {
    id: 'informatics',
    name: '情報科学',
    color: 'bg-indigo-100 border-indigo-300'
  }
};

// Список всех предметов для селектов
export const SUBJECTS_LIST = Object.values(SUBJECTS);

// Функция для получения цвета по ID предмета
export const getSubjectColor = (subjectId: SubjectId | string): string => {
  return (SUBJECTS[subjectId as SubjectId]?.color) || 'bg-gray-100 border-gray-300';
};

// Типы данных для учителей и учеников
export type TeacherId = '1' | '2' | '3' | '4';
export type StudentId = '1' | '2' | '3' | '4';

// Данные учителей
export const TEACHERS: Record<TeacherId, { id: TeacherId, name: string }> = {
  '1': { id: '1', name: '佐藤 先生' },
  '2': { id: '2', name: '田中 先生' },
  '3': { id: '3', name: '鈴木 先生' },
  '4': { id: '4', name: '山田 先生' }
};

// Данные учеников
export const STUDENTS: Record<StudentId, { id: StudentId, name: string }> = {
  '1': { id: '1', name: '中村さん' },
  '2': { id: '2', name: '小林さん' },
  '3': { id: '3', name: '加藤さん' },
  '4': { id: '4', name: '伊藤さん' }
};

// Списки для селектов
export const TEACHERS_LIST = Object.values(TEACHERS);
export const STUDENTS_LIST = Object.values(STUDENTS);

// Функции для получения имен
export const getTeacherName = (teacherId: TeacherId | string): string => {
  return TEACHERS[teacherId as TeacherId]?.name || '';
};

export const getStudentName = (studentId: StudentId | string): string => {
  return STUDENTS[studentId as StudentId]?.name || '';
};

// Функция для получения имени предмета по ID
export const getSubjectName = (subjectId: SubjectId | string): string => {
  return SUBJECTS[subjectId as SubjectId]?.name || '';
};