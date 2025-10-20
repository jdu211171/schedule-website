// src/hooks/useStudentTypeQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import {
  studentTypeFilterSchema,
  type StudentTypeSortField,
} from "@/schemas/student-type.schema";

export type StudentType = {
  studentTypeId: string;
  name: string;
  maxYears: number | null;
  description: string | null;
  order: number | null;
  createdAt: Date;
  updatedAt: Date;
  _optimistic?: boolean;
};

type UseStudentTypesParams = {
  page?: number;
  limit?: number;
  name?: string;
  sortBy?: StudentTypeSortField;
  sortOrder?: "asc" | "desc";
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

/**
 * Hook to fetch a list of student types with pagination and filtering.
 */
export function useStudentTypes(params: UseStudentTypesParams = {}) {
  const {
    page = 1,
    limit = 10,
    name,
    sortBy = "order",
    sortOrder = "asc",
  } = params;

  const query = studentTypeFilterSchema.parse({
    page: page.toString(),
    limit: limit.toString(),
    name,
    sortBy,
    sortOrder,
  });

  const searchParams = new URLSearchParams(
    Object.entries(query).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      },
      {} as Record<string, string>
    )
  ).toString();

  return useQuery<StudentTypesResponse>({
    queryKey: ["studentTypes", page, limit, name, sortBy, sortOrder],
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
      return response.data[0];
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

// New hook for getting all student types in order (useful for dropdowns/selects)
export function useAllStudentTypesOrdered() {
  return useQuery<StudentType[]>({
    queryKey: ["studentTypes-all-ordered"],
    queryFn: async () => {
      const response = await fetcher<StudentTypesResponse>(
        `/api/student-types?limit=100&sortBy=order&sortOrder=asc`
      );
      return response.data;
    },
  });
}
