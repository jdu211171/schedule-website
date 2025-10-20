// src/hooks/useSubjectQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { subjectFilterSchema } from "@/schemas/subject.schema";

export type Subject = {
  subjectId: string;
  name: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type UseSubjectsParams = {
  page?: number;
  limit?: number;
  name?: string;
};

type SubjectsResponse = {
  data: Subject[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleSubjectResponse = {
  data: Subject[];
};

export function useSubjects(params: UseSubjectsParams = {}) {
  const { page = 1, limit = 10, name } = params;

  const query = subjectFilterSchema.parse({
    page,
    limit,
    name,
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

  return useQuery<SubjectsResponse>({
    queryKey: ["subjects", page, limit, name],
    queryFn: async () =>
      await fetcher<SubjectsResponse>(`/api/subjects?${searchParams}`),
  });
}

export function useSubject(subjectId: string) {
  return useQuery<Subject>({
    queryKey: ["subject", subjectId],
    queryFn: async () =>
      await fetcher<SingleSubjectResponse>(`/api/subjects/${subjectId}`).then(
        (res) => res.data[0]
      ),
    enabled: !!subjectId,
  });
}

/**
 * Hook to fetch all subjects (without pagination) for dropdowns and selects.
 * Useful for forms where you need to show all available subjects.
 */
export function useAllSubjects() {
  return useQuery<Subject[]>({
    queryKey: ["subjects", "all"],
    queryFn: async () => {
      const response = await fetcher<SubjectsResponse>(
        `/api/subjects?limit=100`
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - subjects don't change frequently
  });
}
