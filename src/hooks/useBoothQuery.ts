// src/hooks/useBoothQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { Booth } from "@prisma/client";
import { boothFilterSchema, type BoothSortField } from "@/schemas/booth.schema";

type UseBoothsParams = {
  page?: number;
  limit?: number;
  name?: string;
  status?: boolean;
  sortBy?: BoothSortField;
  sortOrder?: "asc" | "desc";
};

// Extended Booth type that includes branchName from the API
type ExtendedBooth = Booth & {
  branchName: string;
  order: number | null;
};

type BoothsResponse = {
  data: ExtendedBooth[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleBoothResponse = {
  data: ExtendedBooth;
};

export function useBooths(params: UseBoothsParams = {}) {
  const {
    page = 1,
    limit = 10,
    name,
    status,
    sortBy = "order",
    sortOrder = "asc",
  } = params;

  const query = boothFilterSchema.parse({
    page,
    limit,
    name,
    status,
    sortBy,
    sortOrder,
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

  return useQuery<BoothsResponse>({
    queryKey: ["booths", page, limit, name, status, sortBy, sortOrder],
    queryFn: async () =>
      await fetcher<BoothsResponse>(`/api/booths?${searchParams}`),
  });
}

// New hook for getting all booths in order (useful for dropdowns/selects)
export function useAllBoothsOrdered() {
  return useQuery<ExtendedBooth[]>({
    queryKey: ["booths-all-ordered"],
    queryFn: async () => {
      const response = await fetcher<BoothsResponse>(
        `/api/booths?limit=100&sortBy=order&sortOrder=asc`
      );
      return response.data;
    },
  });
}

export function useBooth(boothId: string) {
  return useQuery<ExtendedBooth>({
    queryKey: ["booth", boothId],
    queryFn: async () =>
      await fetcher<SingleBoothResponse>(`/api/booths/${boothId}`).then(
        (res) => res.data
      ),
    enabled: !!boothId,
  });
}
