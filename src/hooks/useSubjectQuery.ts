import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import {
  SubjectQuerySchema,
  SubjectWithRelations,
} from "@/schemas/subject.schema";

type UseSubjectsParams = {
  page?: number;
  limit?: number;
  name?: string;
  subjectTypeId?: string;
  sort?: string;
  order?: "asc" | "desc";
};

type SubjectsResponse = {
  data: SubjectWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleSubjectResponse = {
  data: SubjectWithRelations;
};

export function useSubjects(params: UseSubjectsParams = {}) {
  const { page = 1, limit = 10, name, subjectTypeId, sort, order } = params;

  const query = SubjectQuerySchema.parse({
    page,
    limit,
    name,
    subjectTypeId,
    sort,
    order,
  });
  const searchParams = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<SubjectsResponse>({
    queryKey: ["subjects", page, limit, name, subjectTypeId, sort, order],
    queryFn: async () =>
      await fetcher<SubjectsResponse>(`/api/subjects?${searchParams}`),
  });
}

export function useSubject(subjectId: string) {
  return useQuery<SubjectWithRelations>({
    queryKey: ["subject", subjectId],
    queryFn: async () =>
      await fetcher<SingleSubjectResponse>(`/api/subjects/${subjectId}`).then(
        (res) => res.data
      ),
    enabled: !!subjectId,
  });
}
