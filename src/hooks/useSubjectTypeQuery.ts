// src/hooks/useSubjectTypeQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { subjectTypeFilterSchema } from "@/schemas/subject-type.schema";

export type SubjectType = {
  subjectTypeId: string;
  name: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type UseSubjectTypesParams = {
  page?: number;
  limit?: number;
  name?: string;
};

type SubjectTypesResponse = {
  data: SubjectType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleSubjectTypeResponse = {
  data: SubjectType[];
};

export function useSubjectTypes(params: UseSubjectTypesParams = {}) {
  const { page = 1, limit = 10, name } = params;

  const query = subjectTypeFilterSchema.parse({
    page,
    limit,
    name,
  });

  const searchParams = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<SubjectTypesResponse>({
    queryKey: ["subjectTypes", page, limit, name],
    queryFn: async () =>
      await fetcher<SubjectTypesResponse>(`/api/subject-types?${searchParams}`),
  });
}

export function useSubjectType(subjectTypeId: string) {
  return useQuery<SubjectType>({
    queryKey: ["subjectType", subjectTypeId],
    queryFn: async () =>
      await fetcher<SingleSubjectTypeResponse>(
        `/api/subject-types/${subjectTypeId}`
      ).then((res) => res.data[0]),
    enabled: !!subjectTypeId,
  });
}

/**
 * Hook to fetch all subject types (without pagination) for dropdowns and selects.
 * Useful for forms where you need to show all available subject types.
 */
export function useAllSubjectTypes() {
  return useQuery<SubjectType[]>({
    queryKey: ["subjectTypes", "all"],
    queryFn: async () => {
      const response = await fetcher<SubjectTypesResponse>(
        `/api/subject-types?limit=100`
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - subject types don't change frequently
  });
}
