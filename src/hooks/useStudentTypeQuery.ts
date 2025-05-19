// src/hooks/useStudentTypeQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { studentTypeFilterSchema } from "@/schemas/student-type.schema";

export type StudentType = {
  studentTypeId: string;
  name: string;
  maxYears: number | null;
  description: string | null;
  studentCount: number;
  createdAt: Date;
  updatedAt: Date;
};

type UseStudentTypesParams = {
  page?: number;
  limit?: number;
  name?: string;
};

type StudentTypesResponse = {
  data: StudentType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleStudentTypeResponse = {
  data: StudentType[];
};

export function useStudentTypes(params: UseStudentTypesParams = {}) {
  const { page = 1, limit = 10, name } = params;

  // Convert number parameters to strings before passing to schema
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

  return useQuery<StudentTypesResponse>({
    queryKey: ["studentTypes", page, limit, name],
    queryFn: async () =>
      await fetcher<StudentTypesResponse>(`/api/student-types?${searchParams}`),
  });
}

export function useStudentType(studentTypeId: string) {
  return useQuery<StudentType>({
    queryKey: ["studentType", studentTypeId],
    queryFn: async () =>
      await fetcher<SingleStudentTypeResponse>(
        `//api/student-types/${studentTypeId}`
      ).then((res) => res.data[0]),
    enabled: !!studentTypeId,
  });
}
