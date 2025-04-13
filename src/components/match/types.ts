export type SchoolType = "PUBLIC" | "PRIVATE";
export type ExamSchoolCategoryType = "ELEMENTARY" | "MIDDLE" | "HIGH" | "UNIVERSITY" | "OTHER";

export interface Teacher {
  teacherId: string;
  name: string;
  evaluationId: string | null;
  birthDate: Date | null;
  mobileNumber: string | null;
  email: string | null;
  highSchool: string | null;
  university: string | null;
  faculty: string | null;
  department: string | null;
  enrollmentStatus: string | null;
  otherUniversities: string | null;
  englishProficiency: string | null;
  toeic: number | null;
  toefl: number | null;
  mathCertification: string | null;
  kanjiCertification: string | null;
  otherCertifications: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  subjects?: Subject[];
  evaluation?: Evaluation | null;
}

export interface Student {
  studentId: string;
  name: string;
  kanaName: string | null;
  gradeId: string | null;
  schoolName: string | null;
  schoolType: SchoolType | null;
  examSchoolType: SchoolType | null;
  examSchoolCategoryType: ExamSchoolCategoryType | null;
  firstChoiceSchool: string | null;
  secondChoiceSchool: string | null;
  enrollmentDate: Date | null;
  birthDate: Date | null;
  homePhone: string | null;
  parentMobile: string | null;
  studentMobile: string | null;
  parentEmail: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  grade?: Grade | null;
  studentType?: StudentType | null;
  subjects?: Subject[];
}

export interface Subject {
  subjectId: string;
  name: string;
  subjectTypeId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  subjectType?: SubjectType | null;
}

export interface SubjectType {
  subjectTypeId: string;
  name: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Grade {
  gradeId: string;
  name: string;
  studentTypeId: string | null;
  gradeYear: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  studentType?: StudentType | null;
}

export interface StudentType {
  studentTypeId: string;
  name: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Evaluation {
  evaluationId: string;
  name: string;
  score: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassType {
  classTypeId: string;
  name: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Тип для урока
export interface Lesson {
  id: string;
  name: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  status: string;
  teacherId: string;
  studentId: string;
  subjectId?: string;
  subject?: Subject;
  classTypeId?: string;
  classType?: ClassType;
}