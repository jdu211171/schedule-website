// src/hooks/useTeacherQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { teacherFilterSchema } from "@/schemas/teacher.schema";

export type Teacher = {
  teacherId: string;
  userId: string;
  name: string;
  kanaName: string | null;
  email: string | null;
  lineId: string | null;
  notes: string | null;
  username: string | null;
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

type UseTeachersParams = {
  page?: number;
  limit?: number;
  name?: string;
};

type TeachersResponse = {
  data: Teacher[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

export function useTeachers(params: UseTeachersParams = {}) {
  const { page = 1, limit = 10, name } = params;

  const queryParams: Record<string, string | undefined> = {
    page: page.toString(),
    limit: limit.toString(),
    name,
  };

  const searchParams = new URLSearchParams(
    Object.entries(queryParams).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<TeachersResponse>({
    queryKey: ["teachers", page, limit, name],
    queryFn: async () =>
      await fetcher<TeachersResponse>(`/api/teachers?${searchParams}`),
  });
}

export function useTeacher(teacherId: string) {
  return useQuery<Teacher>({
    queryKey: ["teacher", teacherId],
    queryFn: async () =>
      await fetcher<{ data: Teacher[] }>(`/api/teachers/${teacherId}`).then(
        (res) => res.data[0]
      ),
    enabled: !!teacherId,
  });
}
