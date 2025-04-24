// Файл с моковыми данными для тестирования
// @/components/match/mock-data.ts

import { Student, Teacher, Subject, TeacherSubject, Lesson } from '@/components/match/types';

export const mockSubjects: Subject[] = [
  {
    subjectId: 'subject1',
    name: '数学', 
    subjectTypeId: 'math',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    subjectId: 'subject2',
    name: '英語', 
    subjectTypeId: 'language',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    subjectId: 'subject3',
    name: '物理', 
    subjectTypeId: 'science',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    subjectId: 'subject4',
    name: '化学', 
    subjectTypeId: 'science',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const mockTeachers: Teacher[] = [
  {
    teacherId: 'teacher1',
    name: '鈴木先生', 
    evaluationId: 'eval1',
    birthDate: new Date('1980-01-15'),
    mobileNumber: '090-1234-5678',
    email: 'suzuki@example.com',
    highSchool: '東京高校',
    university: '東京大学',
    faculty: '教育学部',
    department: '数学教育',
    enrollmentStatus: '卒業',
    otherUniversities: null,
    englishProficiency: '上級',
    toeic: 850,
    toefl: null,
    mathCertification: '上級',
    kanjiCertification: null,
    otherCertifications: null,
    notes: '経験豊富な数学教師',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    teacherId: 'teacher2',
    name: '田中先生', 
    evaluationId: 'eval2',
    birthDate: new Date('1985-05-20'),
    mobileNumber: '090-8765-4321',
    email: 'tanaka@example.com',
    highSchool: '大阪高校',
    university: '京都大学',
    faculty: '文学部',
    department: '英文学',
    enrollmentStatus: '卒業',
    otherUniversities: null,
    englishProficiency: '母国語',
    toeic: 990,
    toefl: 110,
    mathCertification: null,
    kanjiCertification: '1級',
    otherCertifications: 'TESOL',
    notes: '経験豊富な英語教師',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    teacherId: 'teacher3',
    name: '佐藤先生', 
    evaluationId: 'eval3',
    birthDate: new Date('1990-10-05'),
    mobileNumber: '090-5555-1234',
    email: 'sato@example.com',
    highSchool: '名古屋高校',
    university: '名古屋大学',
    faculty: '理学部',
    department: '物理学科',
    enrollmentStatus: '卒業',
    otherUniversities: null,
    englishProficiency: '中級',
    toeic: 750,
    toefl: null,
    mathCertification: '中級',
    kanjiCertification: null,
    otherCertifications: null,
    notes: '親しみやすい先生',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const mockStudents: Student[] = [
  {
    studentId: 'student1',
    name: '山田太郎', 
    kanaName: 'ヤマダタロウ',
    gradeId: 'grade1',
    schoolName: '東京中学校',
    schoolType: 'PUBLIC',
    examSchoolType: 'PRIVATE',
    examSchoolCategoryType: 'HIGH',
    firstChoiceSchool: '東京高校',
    secondChoiceSchool: '千葉高校',
    enrollmentDate: new Date('2023-04-01'),
    birthDate: new Date('2007-06-15'),
    homePhone: '03-1234-5678',
    parentMobile: '090-1111-2222',
    studentMobile: '090-3333-4444',
    parentEmail: 'yamada-parent@example.com',
    notes: '数学が得意',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    studentId: 'student2',
    name: '鈴木花子', 
    kanaName: 'スズキハナコ',
    gradeId: 'grade2',
    schoolName: '千葉中学校',
    schoolType: 'PRIVATE',
    examSchoolType: 'PRIVATE',
    examSchoolCategoryType: 'HIGH',
    firstChoiceSchool: '千葉高校',
    secondChoiceSchool: '東京高校',
    enrollmentDate: new Date('2023-04-01'),
    birthDate: new Date('2007-12-10'),
    homePhone: '04-5678-1234',
    parentMobile: '090-5555-6666',
    studentMobile: '090-7777-8888',
    parentEmail: 'suzuki-parent@example.com',
    notes: '英語が得意',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    studentId: 'student3',
    name: '佐藤さくら', 
    kanaName: 'サトウサクラ',
    gradeId: 'grade1',
    schoolName: '大阪中学校',
    schoolType: 'PUBLIC',
    examSchoolType: 'PRIVATE',
    examSchoolCategoryType: 'HIGH',
    firstChoiceSchool: '京都高校',
    secondChoiceSchool: '大阪高校',
    enrollmentDate: new Date('2023-04-01'),
    birthDate: new Date('2007-08-20'),
    homePhone: '06-1234-5678',
    parentMobile: '090-9999-8888',
    studentMobile: '090-7777-6666',
    parentEmail: 'sato-parent@example.com',
    notes: '英語を勉強したい',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const studentPreferences = {
  'student1': {
    preferredSubjects: ['subject1', 'subject3'],
    preferredTeachers: ['teacher1'],
    preferredWeekdays: ['monday', 'wednesday'],
    preferredHours: ['afternoon'],
    additionalNotes: '数学を中心に学びたい'
  },
  'student2': {
    preferredSubjects: ['subject2', 'subject4'],
    preferredTeachers: ['teacher2'],
    preferredWeekdays: ['tuesday', 'thursday'],
    preferredHours: ['evening'],
    additionalNotes: '英語を中心に学びたい'
  },
  'student3': {
    preferredSubjects: ['subject2'],
    preferredTeachers: [],
    preferredWeekdays: ['monday', 'wednesday'],
    preferredHours: ['afternoon', 'evening'],
    additionalNotes: '英語を勉強したい'
  }
};

export const mockTeacherSubjects: TeacherSubject[] = [
  {
    teacherId: 'teacher1',
    subjectId: 'subject1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    teacherId: 'teacher1',
    subjectId: 'subject3',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    teacherId: 'teacher2',
    subjectId: 'subject2',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    teacherId: 'teacher2',
    subjectId: 'subject1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    teacherId: 'teacher3',
    subjectId: 'subject3',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    teacherId: 'teacher3',
    subjectId: 'subject4',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    teacherId: 'teacher3',
    subjectId: 'subject2',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const teacherAvailability = {
  'teacher1': {
    monday: [
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '18:00' }
    ],
    wednesday: [
      { start: '10:00', end: '15:00' }
    ],
    friday: [
      { start: '13:00', end: '19:00' }
    ]
  },
  'teacher2': {
    monday: [
      { start: '10:00', end: '12:00' },
      { start: '17:00', end: '19:00' }
    ],
    tuesday: [
      { start: '09:00', end: '14:00' }
    ],
    thursday: [
      { start: '15:00', end: '19:00' }
    ],
    saturday: [
      { start: '10:00', end: '12:00' },
      { start: '17:00', end: '19:00' }
    ]
  },
  'teacher3': {
    monday: [
      { start: '15:00', end: '18:00' }
    ],
    tuesday: [
      { start: '14:00', end: '20:00' }
    ],
    thursday: [
      { start: '09:00', end: '15:00' }
    ],
    friday: [
      { start: '16:00', end: '20:00' }
    ]
  }
};

export const studentAvailability = {
  'student1': {
    monday: [
      { start: '15:00', end: '19:00' }
    ],
    wednesday: [
      { start: '11:00', end: '18:00' }
    ],
    friday: [
      { start: '16:00', end: '20:00' }
    ]
  },
  'student2': {
    tuesday: [
      { start: '10:00', end: '14:00' }
    ],
    thursday: [
      { start: '15:00', end: '19:00' }
    ],
    saturday: [
      { start: '09:00', end: '12:00' }
    ]
  },
  'student3': {
    monday: [
      { start: '15:00', end: '19:00' }
    ],
    wednesday: [
      { start: '16:00', end: '20:00' }
    ]
  }
};

export const mockLessons: Lesson[] = [
  // Уроки между 鈴木先生 (teacher1) и 山田太郎 (student1)
  {
    id: 'lesson1',
    name: '数学', // Математика
    dayOfWeek: 1, // Понедельник (monday)
    startTime: '15:00',
    endTime: '16:30',
    status: '有効', // Активен
    teacherId: 'teacher1', // 鈴木先生
    studentId: 'student1', // 山田太郎
    subjectId: 'subject1' // Математика
  },
  {
    id: 'lesson2',
    name: '物理', // Физика
    dayOfWeek: 3, // Среда (wednesday)
    startTime: '13:00',
    endTime: '14:30',
    status: '有効',
    teacherId: 'teacher1', // 鈴木先生
    studentId: 'student1', // 山田太郎
    subjectId: 'subject3' // Физика
  },
  
  // Урок между 田中先生 (teacher2) и 山田太郎 (student1)
  // Понедельник 17:00-18:30 (у 田中先生 свободно 17:00-19:00, у 山田太郎 15:00-19:00)
  {
    id: 'lesson3',
    name: '数学', // Математика
    dayOfWeek: 1, // Понедельник (monday)
    startTime: '17:00',
    endTime: '18:30',
    status: '有効',
    teacherId: 'teacher2', // 田中先生
    studentId: 'student1', // 山田太郎
    subjectId: 'subject1' // Математика (оба могут)
  },
  
  // Уроки между 田中先生 (teacher2) и другими учениками
  {
    id: 'lesson4',
    name: '英語', // Английский
    dayOfWeek: 2, // Вторник (tuesday)
    startTime: '10:00',
    endTime: '11:30',
    status: '有効',
    teacherId: 'teacher2', // 田中先生
    studentId: 'student2', // 鈴木花子
    subjectId: 'subject2' // Английский
  },
  {
    id: 'lesson5',
    name: '英語', // Английский
    dayOfWeek: 4, // Четверг (thursday)
    startTime: '16:00',
    endTime: '17:30',
    status: '有効',
    teacherId: 'teacher2', // 田中先生
    studentId: 'student3', // 佐藤さくら
    subjectId: 'subject2' // Английский
  },
  
  // Урок между 鈴木先生 (teacher1) и 鈴木花子 (student2)
  {
    id: 'lesson6',
    name: '数学', // Математика
    dayOfWeek: 2, // Вторник (tuesday) - у student2 доступен вторник, а у teacher1 нет, но для примера
    startTime: '11:00',
    endTime: '12:30',
    status: '有効',
    teacherId: 'teacher1', // 鈴木先生
    studentId: 'student2', // 鈴木花子
    subjectId: 'subject1' // Математика
  },
  
  // Урок между 佐藤先生 (teacher3) и 山田太郎 (student1)
  {
    id: 'lesson7',
    name: '物理', // Физика
    dayOfWeek: 1, // Понедельник (monday)
    startTime: '16:30',
    endTime: '18:00',
    status: '有効',
    teacherId: 'teacher3', // 佐藤先生
    studentId: 'student1', // 山田太郎
    subjectId: 'subject3' // Физика
  }
];