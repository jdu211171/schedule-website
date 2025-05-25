// src/hooks/useStudentTypeQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";

export type StudentType = {
  studentTypeId: string;
  name: string;
  maxYears: number | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _optimistic?: boolean;
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
  data: StudentType;
};

/**
 * Hook to fetch a list of student types with pagination and filtering.
 */
export function useStudentTypes(params: UseStudentTypesParams = {}) {
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

  return useQuery<StudentTypesResponse>({
    queryKey: ["studentTypes", page, limit, name],
    queryFn: async () =>
      await fetcher<StudentTypesResponse>(`/api/student-types?${searchParams}`),
  });
}

/**
 * Hook to fetch a single student type by its ID.
 */
export function useStudentType(studentTypeId: string | undefined | null) {
  return useQuery<StudentType>({
    queryKey: ["studentType", studentTypeId],
    queryFn: async () => {
      if (!studentTypeId) {
        throw new Error(
          "studentTypeId is required to fetch a single student type."
        );
      }
      const response = await fetcher<SingleStudentTypeResponse>(
        `/api/student-types/${studentTypeId}`
      );
      return response.data;
    },
    enabled: !!studentTypeId,
  });
}

/**
 * Hook to fetch all student types (without pagination) for dropdowns and selects.
 * Useful for forms where you need to show all available student types.
 */
export function useAllStudentTypes() {
  return useQuery<StudentType[]>({
    queryKey: ["studentTypes", "all"],
    queryFn: async () => {
      const response = await fetcher<StudentTypesResponse>(
        `/api/student-types?limit=1000`
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - student types don't change frequently
  });
}
