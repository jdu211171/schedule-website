import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { ClassTypeQuerySchema } from "@/schemas/class-type.schema";
import { ClassType } from "@prisma/client";

type UseClassTypesParams = {
  page?: number;
  limit?: number;
  name?: string;
  sort?: string;
  order?: "asc" | "desc";
};

type ClassTypesResponse = {
  data: ClassType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleClassTypeResponse = {
  data: ClassType;
};

export function useClassTypes(params: UseClassTypesParams = {}) {
  const { page = 1, limit = 10, name, sort, order } = params;

  const query = ClassTypeQuerySchema.parse({ page, limit, name, sort, order });
  const searchParams = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<ClassTypesResponse>({
    queryKey: ["classTypes", page, limit, name, sort, order],
    queryFn: async () => await fetcher<ClassTypesResponse>(`/api/class-type?${searchParams}`),
  });
}

export function useClassType(classTypeId: string) {
  return useQuery<ClassType>({
    queryKey: ["classType", classTypeId],
    queryFn: async () => await fetcher<SingleClassTypeResponse>(`/api/class-type/${classTypeId}`).then((res) => res.data),
    enabled: !!classTypeId,
  });
}