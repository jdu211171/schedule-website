// src/hooks/useStudentQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";

export type Student = {
  studentId: string;
  userId: string;
  name: string;
  kanaName: string | null;
  studentTypeId: string | null;
  studentTypeName: string | null;
  maxYears: number | null;
  gradeYear: number | null;
  lineId: string | null;
  parentLineId1: string | null;
  lineUserId: string | null;
  lineNotificationsEnabled: boolean | null;
  notes: string | null;
  status: string;
  username: string | null;
  email: string | null;
  password: string | null;
  branches: {
    branchId: string;
    name: string;
  }[];
  subjectPreferences: {
    subjectId: string;
    subjectTypeIds: string[];
    preferredTeacherIds?: string[];
  }[];
  regularAvailability: {
    dayOfWeek: string;
    timeSlots: {
      id: string;
      startTime: string;
      endTime: string;
    }[];
    fullDay: boolean;
  }[];
  exceptionalAvailability: {
    date: string;
    timeSlots: {
      id: string;
      startTime: string;
      endTime: string;
    }[];
    fullDay: boolean;
    reason?: string | null;
    notes?: string | null;
  }[];
  absenceAvailability: {
    date: string;
    timeSlots: {
      id: string;
      startTime: string;
      endTime: string;
    }[];
    fullDay: boolean;
    reason?: string | null;
    notes?: string | null;
  }[];
  // School information
  schoolName: string | null;
  schoolType: string | null;
  // Exam information
  examCategory: string | null;
  examCategoryType: string | null;
  firstChoice: string | null;
  secondChoice: string | null;
  examDate: Date | null;
  // Contact information
  homePhone: string | null;
  parentPhone: string | null;
  studentPhone: string | null;
  parentEmail: string | null;
  // Personal information
  birthDate: Date | null;
  // Contact phones
  contactPhones: {
    id: string;
    phoneType: string;
    phoneNumber: string;
    notes: string | null;
    order: number;
  }[];
  // Contact emails (non-login informational emails)
  contactEmails: {
    id: string;
    email: string;
    notes: string | null;
    order: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
  _optimistic?: boolean;
};

type UseStudentsParams = {
  page?: number;
  limit?: number;
  name?: string;
  studentTypeId?: string;
  studentTypeIds?: string[]; // Support multiple student type IDs
  gradeYear?: number;
  gradeYears?: number[]; // Support multiple grade years
  status?: string;
  statuses?: string[]; // Support multiple statuses
  branchIds?: string[]; // Filter by branches
  subjectIds?: string[]; // Filter by subject preferences
  lineConnection?: string[]; // Filter by message connection status
  schoolType?: string; // Filter by school type
  schoolTypes?: string[]; // Support multiple school types
  examCategory?: string; // Filter by exam category
  examCategories?: string[]; // Support multiple exam categories
  examCategoryType?: string; // Filter by exam category type
  examCategoryTypes?: string[]; // Support multiple exam category types
  birthDateFrom?: Date; // Filter by birth date range
  birthDateTo?: Date;
  examDateFrom?: Date; // Filter by exam date range
  examDateTo?: Date;
};

type StudentsResponse = {
  data: Student[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

export function useStudents(params: UseStudentsParams = {}) {
  const {
    page = 1,
    limit = 10,
    name,
    studentTypeId,
    studentTypeIds,
    gradeYear,
    gradeYears,
    status,
    statuses,
    branchIds,
    subjectIds,
    lineConnection,
    schoolType,
    schoolTypes,
    examCategory,
    examCategories,
    examCategoryType,
    examCategoryTypes,
    birthDateFrom,
    birthDateTo,
    examDateFrom,
    examDateTo,
  } = params;

  const queryParams: Record<string, string | string[] | undefined> = {
    page: page.toString(),
    limit: limit.toString(),
    name,
    studentTypeId,
    studentTypeIds,
    gradeYear: gradeYear?.toString(),
    gradeYears: gradeYears?.map(y => y.toString()),
    status,
    statuses,
    branchIds,
    subjectIds,
    lineConnection,
    schoolType,
    schoolTypes,
    examCategory,
    examCategories,
    examCategoryType,
    examCategoryTypes,
    birthDateFrom: birthDateFrom?.toISOString(),
    birthDateTo: birthDateTo?.toISOString(),
    examDateFrom: examDateFrom?.toISOString(),
    examDateTo: examDateTo?.toISOString(),
  };

  // Build search params manually to handle arrays
  const searchParams = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        // For arrays, add multiple parameters with the same key
        value.forEach(v => searchParams.append(key, v));
      } else {
        searchParams.append(key, value);
      }
    }
  });

  return useQuery<StudentsResponse>({
    queryKey: ["students", page, limit, name, studentTypeId, studentTypeIds, gradeYear, gradeYears, status, statuses, branchIds, subjectIds, lineConnection, schoolType, schoolTypes, examCategory, examCategories, examCategoryType, examCategoryTypes, birthDateFrom, birthDateTo, examDateFrom, examDateTo],
    queryFn: async () =>
      await fetcher<StudentsResponse>(`/api/students?${searchParams.toString()}`),
  });
}

export function useStudent(studentId: string) {
  return useQuery<Student>({
    queryKey: ["student", studentId],
    queryFn: async () =>
      await fetcher<{ data: Student[] }>(`/api/students/${studentId}`).then(
        (res) => res.data[0]
      ),
    enabled: !!studentId,
  });
}
