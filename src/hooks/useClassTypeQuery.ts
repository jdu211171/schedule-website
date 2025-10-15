// src/hooks/useClassTypeQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { classTypeFilterSchema } from "@/schemas/class-type.schema";

export type ClassType = {
  classTypeId: string;
  name: string;
  notes: string | null;
  parentId: string | null;
  order: number | null;
  color: string | null;
  visibleInFilters: boolean;
  parent?: ClassType | null;
  children?: ClassType[];
  createdAt: Date;
  updatedAt: Date;
};

type UseClassTypesParams = {
  page?: number;
  limit?: number;
  name?: string;
  parentId?: string | null;
  includeChildren?: boolean;
  includeParent?: boolean;
  visibleOnly?: boolean;
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
  const {
    page = 1,
    limit = 10,
    name,
    parentId,
    includeChildren = false,
    includeParent = false,
    visibleOnly = true,
  } = params;

  const query = classTypeFilterSchema.parse({
    page,
    limit,
    name,
    parentId,
    includeChildren,
    includeParent,
    visibleOnly,
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
    queryKey: [
      "classTypes",
      page,
      limit,
      name,
      parentId,
      includeChildren,
      includeParent,
      visibleOnly,
    ],
    queryFn: async () =>
      await fetcher<ClassTypesResponse>(`/api/class-types?${searchParams}`),
  });
}

export function useClassType(
  classTypeId: string,
  includeChildren = true,
  includeParent = true
) {
  return useQuery<ClassType>({
    queryKey: ["classType", classTypeId, includeChildren, includeParent],
    queryFn: async () => {
      const params = new URLSearchParams({
        includeChildren: String(includeChildren),
        includeParent: String(includeParent),
      });
      return await fetcher<SingleClassTypeResponse>(
        `/api/class-types/${classTypeId}?${params}`
      ).then((res) => res.data[0]);
    },
    enabled: !!classTypeId,
  });
}

/**
 * Hook to fetch all class types in a hierarchical structure (tree view)
 * Returns only top-level class types with their children nested
 */
export function useClassTypeHierarchy() {
  return useQuery<ClassType[]>({
    queryKey: ["classTypes", "hierarchy"],
    queryFn: async () => {
      const response = await fetcher<ClassTypesResponse>(
        `/api/class-types?parentId=null&includeChildren=true&limit=100`
      );
      return response.data;
    },
  });
}

/**
 * Hook to fetch all class types (flat list) for dropdowns and selects
 */
export function useAllClassTypes() {
  return useQuery<ClassType[]>({
    queryKey: ["classTypes", "all"],
    queryFn: async () => {
      const response = await fetcher<ClassTypesResponse>(
        `/api/class-types?limit=100`
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - class types don't change frequently
  });
}
