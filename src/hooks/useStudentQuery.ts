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
    gradeYear,
    status,
  } = params;

  const queryParams: Record<string, string | undefined> = {
    page: page.toString(),
    limit: limit.toString(),
    name,
    studentTypeId,
    gradeYear: gradeYear?.toString(),
    status,
  };

  const searchParams = new URLSearchParams(
    Object.entries(queryParams).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<StudentsResponse>({
    queryKey: ["students", page, limit, name, studentTypeId, gradeYear, status],
    queryFn: async () =>
      await fetcher<StudentsResponse>(`/api/students?${searchParams}`),
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
