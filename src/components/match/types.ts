// components/match/types.ts

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

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
  subjectId?: string | string[];  
  evaluationId?: string | string[]; 
}

export interface TeacherResponse {
  data: Teacher[];
}

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

export interface TeacherShift {
  id?: string;
  teacherId?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  [key: string]: unknown;
}

export interface TimeSlotPreference {
  id?: string;
  studentId?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  [key: string]: unknown;
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
  examSchoolType?: string | string[];
  preferredSubjectId?: string | string[];
  studentTypeId?: string | string[];
  gradeId?: string | null;
}

export interface StudentResponse {
  data: Student[];
}

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

export interface RegularClassTemplate {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  teacherId: string;
  subjectId: string;
  boothId: string;
  studentIds: string[];
  notes?: string;
  startDate?: string;
  endDate?: string;
}

export interface ClassSessionTemplate extends ClassSession {
  templateId?: string;
  id?: string;
  studentIds?: string[];
  subjectName?: string;
  templateStudentAssignments?: Array<{
    id?: string;
    templateId?: string;
    studentId?: string;
    [key: string]: unknown;
  }>;
  startDate?: string | null;
  endDate?: string | null;
  booth?: {
    boothId: string;
    name: string;
    status: boolean;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  };
  subject?: {
    subjectId: string;
    name: string;
    notes: string | null;
    subjectTypeId: string;
    createdAt: string;
    updatedAt: string;
  };
  teacher?: {
    teacherId: string;
    name: string;
    email?: string;
    mobileNumber?: string;
    birthDate?: string;
    university?: string;
    faculty?: string;
    department?: string;
    evaluationId?: string;
    enrollmentStatus?: string;
    highSchool?: string;
    userId?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface ClassSessionResponse {
  data: ClassSession[];
}

export interface CompatibleSubjectsResponse {
  data: {
    commonSubjects: Subject[];
    otherSubjects: Subject[];
    allSubjects: Subject[];
  };
}

export interface AvailableTimeSlotsResponse {
  data: {
    availableSlots: Array<{
      dayOfWeek: string;
      startTime: string;
      endTime: string;
    }>;
    teacherShifts: Array<TeacherShift>;
    studentPreferences: Array<TimeSlotPreference>;
  };
}

export interface AvailableBoothsResponse {
  data: Array<{
    boothId: string;
    name: string;
    status: boolean;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface DisplayLesson {
  id: string;
  templateId?: string;
  name: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  status?: string;
  teacherId: string;
  studentId: string;
  subjectId?: string;
  subjectName?: string;
  teacherName?: string;
  studentName?: string;
  room?: string;
  boothId?: string;
  lessonType?: 'teacher' | 'student' | 'current';
}

export interface TemplateDataFromAPI {
  templateId?: string;
  id?: string;
  dayOfWeek?: string | number;
  startTime?: string;
  endTime?: string;
  teacherId?: string;
  studentId?: string;
  studentIds?: string[];
  subjectId?: string;
  boothId?: string;
  status?: string;
  subject?: {
    subjectId?: string;
    name?: string;
    notes?: string | null;
    subjectTypeId?: string;
    createdAt?: string;
    updatedAt?: string;
  } | Subject | null;
  booth?: {
    boothId?: string;
    name?: string;
    status?: boolean;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  subjectName?: string;
  teacherName?: string;
  studentName?: string;
  room?: string;
  notes?: string;
  startDate?: string | null;
  endDate?: string | null;
  templateStudentAssignments?: Array<unknown>;
  createdAt?: string;
  updatedAt?: string;
  teacher?: {
    teacherId?: string;
    name?: string;
    email?: string;
    mobileNumber?: string;
    birthDate?: string;
    university?: string;
    faculty?: string;
    department?: string;
    evaluationId?: string;
    enrollmentStatus?: string;
    highSchool?: string;
    userId?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface TeacherFilterParams {
  subjectId?: string[];
  evaluationId?: string[];
}

export interface StudentFilterParams {
  preferredSubjectId?: string[];
  studentTypeId?: string[];
  gradeId?: string | null;
  schoolType?: string | null;
}
