// components/match/types.ts

// Общие типы для пагинации и запросов
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Интерфейсы для учителей
export interface Teacher {
  teacherId: string;
  name: string;
  evaluationId: string | null;
  birthDate: string | null;
  mobileNumber: string | null;
  email: string | null;
  highSchool: string | null;
  university: string | null;
  faculty: string | null;
  department: string | null;
  enrollmentStatus: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
  evaluation?: Evaluation | null;
  teacherSubjects?: TeacherSubject[];
}

export interface Evaluation {
  evaluationId: string;
  name: string;
  score: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherSubject {
  teacherId: string;
  subjectId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherParams extends PaginationParams {
  name?: string;
  email?: string;
  university?: string;
  enrollmentStatus?: string;
}

export interface TeacherResponse {
  data: Teacher[];
}

// Интерфейсы для учеников
export interface Student {
  studentId: string;
  name: string;
  kanaName: string | null;
  gradeId: string | null;
  schoolName: string | null;
  schoolType: string | null;
  examSchoolType: string | null;
  examSchoolCategoryType: string | null;
  birthDate: string | null;
  parentMobile: string | null;
  studentMobile: string | null;
  parentEmail: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
  grade?: Grade | null;
  studentRegularPreferences?: StudentPreference[];
  StudentPreference?: Array<{
    preferenceId: string;
    studentId: string;
    classTypeId: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    subjects?: Array<{
      id: string;
      studentPreferenceId: string;
      subjectId: string;
      subject?: Subject;
    }>;
    teachers?: Array<{
      id: string;
      studentPreferenceId: string;
      teacherId: string;
      teacher?: Teacher;
    }>;
    timeSlots?: Array<{
      slotId: string;
      preferenceId: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      createdAt: string;
      updatedAt: string;
    }>;
  }>;
}

export interface StudentWithPreference extends Student {
  preference?: {
    preferredSubjects: string[];
    preferredTeachers: string[];
    desiredTimes: {
      dayOfWeek: string;
      startTime: string;
      endTime: string;
    }[];
    additionalNotes: string | null;
  } | null;
}

export interface StudentPreference {
  preferredSubjects: string[];
  preferredTeachers: string[];
  preferredWeekdaysTimes: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }[];
  notes: string | null;
}

export interface Grade {
  gradeId: string;
  name: string;
  studentTypeId: string;
  gradeYear: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentParams extends PaginationParams {
  name?: string;
  schoolName?: string;
  gradeName?: string;
  schoolType?: string;
  examSchoolType?: string;
}

export interface StudentResponse {
  data: Student[];
}

// Интерфейсы для предметов
export interface Subject {
  subjectId: string;
  name: string;
  subjectTypeId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectResponse {
  data: Subject[];
}

// Интерфейсы для типов студентов
export interface StudentType {
  studentTypeId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentTypeResponse {
  data: StudentType[];
}

// Интерфейсы для API фильтрации
export interface CompatibleTeachersResponse {
  data: {
    preferredTeachers: Teacher[];
    subjectTeachers: Teacher[];
    otherTeachers: Teacher[];
    allTeachers: Teacher[];
    student?: Student;
    filteredTeachers?: Teacher[];
    kibouSubjects?: Subject[];
  };
}

export interface CompatibleStudentsResponse {
  data: {
    preferredStudents: StudentWithPreference[];
    subjectStudents: StudentWithPreference[];
    otherStudents: StudentWithPreference[];
    allStudents: StudentWithPreference[];
    filteredStudents?: StudentWithPreference[];
    kibouSubjects?: Subject[];
  };
}

// Интерфейс для классов
export interface ClassSession {
  classSessionId?: string;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  boothId?: string;
  startTime?: string;
  endTime?: string;
  dayOfWeek?: string | number;
  status?: string;
  notes?: string;
  subject?: Subject | null;
  name?: string;
  teacherName?: string;
  studentName?: string;
  room?: string;
}

export interface ClassSessionResponse {
  data: ClassSession[];
}



