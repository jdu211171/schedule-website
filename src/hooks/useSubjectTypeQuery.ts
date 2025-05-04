import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { SubjectTypeQuerySchema } from "@/schemas/subject-type.schema";
import { SubjectType } from "@prisma/client";

type UseSubjectTypesParams = {
  page?: number;
  limit?: number;
  name?: string;
  sort?: string;
  order?: "asc" | "desc";
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

export function useSubjectTypes(params: UseSubjectTypesParams = {}) {
  const { page = 1, limit = 10, name, sort, order } = params;

  const query = SubjectTypeQuerySchema.parse({
    page,
    limit,
    name,
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

  return useQuery<SubjectTypesResponse>({
    queryKey: ["subjectType", page, limit, name, sort, order],
    queryFn: async () =>
      await fetcher<SubjectTypesResponse>(`/api/subject-type?${searchParams}`),
  });
}

export function useSubjectType(subjectTypeId: string) {
  return useQuery<SubjectType>({
    queryKey: ["subjectType", subjectTypeId],
    queryFn: async () =>
      await fetcher<SingleSubjectTypeResponse>(
        `/api/subject-type/${subjectTypeId}`
      ).then((res) => res.data),
    enabled: !!subjectTypeId,
  });
}
