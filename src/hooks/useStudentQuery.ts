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
  status?: string;
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
    status,
  } = params;

  const queryParams: Record<string, string | string[] | undefined> = {
    page: page.toString(),
    limit: limit.toString(),
    name,
    studentTypeId,
    studentTypeIds,
    gradeYear: gradeYear?.toString(),
    status,
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
    queryKey: ["students", page, limit, name, studentTypeId, studentTypeIds, gradeYear, status],
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
