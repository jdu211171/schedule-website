import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { StudentTypeQuerySchema } from "@/schemas/student-type.schema";
import { StudentType } from "@prisma/client";

type UseStudentTypesParams = {
  page?: number;
  limit?: number;
  name?: string;
  sort?: string;
  order?: "asc" | "desc";
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

export function useStudentTypes(params: UseStudentTypesParams = {}) {
  const { page = 1, limit = 10, name, sort, order } = params;

  const query = StudentTypeQuerySchema.parse({
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

  return useQuery<StudentTypesResponse>({
    queryKey: ["studentType", page, limit, name, sort, order],
    queryFn: async () =>
      await fetcher<StudentTypesResponse>(`/api/student-type?${searchParams}`),
  });
}

export function useStudentType(studentTypeId: string) {
  return useQuery<StudentType>({
    queryKey: ["studentType", studentTypeId],
    queryFn: async () =>
      await fetcher<SingleStudentTypeResponse>(
        `/api/student-type/${studentTypeId}`
      ).then((res) => res.data),
    enabled: !!studentTypeId,
  });
}

export function useStudentTypesCount() {
  return useQuery<number>({
    queryKey: ["studentType", "count"],
    queryFn: async () => {
      const response = await fetcher<StudentTypesResponse>(
        `/api/student-type?page=1&limit=1`
      );
      return response.pagination.total;
    },
  });
}
