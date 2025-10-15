// src/hooks/useAdminClassTypeQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { classTypeFilterSchema } from "@/schemas/class-type.schema";

export type AdminClassType = {
  classTypeId: string;
  name: string;
  notes: string | null;
  parentId: string | null;
  order: number | null;
  color: string | null;
  visibleInFilters: boolean;
  parent?: AdminClassType | null;
  children?: AdminClassType[];
  createdAt: Date;
  updatedAt: Date;
};

type UseAdminClassTypesParams = {
  page?: number;
  limit?: number;
  name?: string;
  parentId?: string | null;
  includeChildren?: boolean;
  includeParent?: boolean;
};

type ClassTypesResponse = {
  data: AdminClassType[];
  pagination: { total: number; page: number; limit: number; pages: number };
};

export function useAdminClassTypes(params: UseAdminClassTypesParams = {}) {
  const { page = 1, limit = 10, name, parentId, includeChildren = false, includeParent = true } = params;

  const query = classTypeFilterSchema.parse({ page, limit, name, parentId, includeChildren, includeParent });
  const searchParams = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<ClassTypesResponse>({
    queryKey: ["adminClassTypes", page, limit, name, parentId, includeChildren, includeParent],
    queryFn: async () => await fetcher<ClassTypesResponse>(`/api/admin/masterdata/class-types?${searchParams}`),
  });
}

