// src/hooks/useClassTypeQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { classTypeFilterSchema } from "@/schemas/class-type.schema";

export type ClassType = {
  classTypeId: string;
  name: string;
  notes: string | null;
  branchId: string | null;
  branchName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type UseClassTypesParams = {
  page?: number;
  limit?: number;
  name?: string;
  branchId?: string;
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
  data: ClassType[];
};

export function useClassTypes(params: UseClassTypesParams = {}) {
  const { page = 1, limit = 10, name, branchId } = params;

  const query = classTypeFilterSchema.parse({
    page,
    limit,
    name,
    branchId,
  });

  const searchParams = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<ClassTypesResponse>({
    queryKey: ["classTypes", page, limit, name, branchId],
    queryFn: async () =>
      await fetcher<ClassTypesResponse>(`/api/class-types?${searchParams}`),
  });
}

export function useClassType(classTypeId: string) {
  return useQuery<ClassType>({
    queryKey: ["classType", classTypeId],
    queryFn: async () =>
      await fetcher<SingleClassTypeResponse>(
        `/api/class-types/${classTypeId}`
      ).then((res) => res.data[0]),
    enabled: !!classTypeId,
  });
}
