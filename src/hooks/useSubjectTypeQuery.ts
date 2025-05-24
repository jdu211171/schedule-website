// src/hooks/useSubjectTypeQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { subjectTypeFilterSchema } from "@/schemas/subject-type.schema";

export type SubjectType = {
  subjectTypeId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    subjectOfferings: number;
  };
  _optimistic?: boolean;
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
  data: SubjectType;
};

/**
 * Hook to fetch a list of subject types with pagination and filtering.
 */
export function useSubjectTypes(params: UseSubjectTypesParams = {}) {
  const { page = 1, limit = 10, name } = params;

  // Validate and structure parameters using the Zod schema
  const validatedQuery = subjectTypeFilterSchema.parse({
    page,
    limit,
    name,
  });

  // Construct search parameters for the API request
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(validatedQuery)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }
  const queryString = searchParams.toString();

  return useQuery<SubjectTypesResponse>({
    queryKey: ["subjectTypes", validatedQuery],
    queryFn: async () =>
      await fetcher<SubjectTypesResponse>(`/api/subject-types?${queryString}`),
  });
}

/**
 * Hook to fetch a single subject type by its ID.
 */
export function useSubjectType(subjectTypeId: string | undefined | null) {
  return useQuery<SubjectType>({
    queryKey: ["subjectType", subjectTypeId],
    queryFn: async () => {
      if (!subjectTypeId) {
        throw new Error(
          "subjectTypeId is required to fetch a single subject type."
        );
      }
      const response = await fetcher<SingleSubjectTypeResponse>(
        `/api/subject-types/${subjectTypeId}`
      );
      return response.data;
    },
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
        `/api/subject-types?limit=1000`
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - subject types don't change frequently
  });
}
