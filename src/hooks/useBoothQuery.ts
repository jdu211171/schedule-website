import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { Booth } from "@prisma/client";
import { boothFilterSchema } from "@/schemas/booth.schema";

type UseBoothsParams = {
  page?: number;
  limit?: number;
  name?: string;
  status?: boolean;
  sort?: string;
  order?: "asc" | "desc";
};

type BoothsResponse = {
  data: Booth[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleBoothResponse = {
  data: Booth;
};

export function useBooths(params: UseBoothsParams = {}) {
  const { page = 1, limit = 10, name, status, sort, order } = params;

  const query = boothFilterSchema.parse({
    page,
    limit,
    name,
    status,
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

  return useQuery<BoothsResponse>({
    queryKey: ["booths", page, limit, name, status, sort, order],
    queryFn: async () =>
      await fetcher<BoothsResponse>(`/api/booths?${searchParams}`),
  });
}

export function useBooth(boothId: string) {
  return useQuery<Booth>({
    queryKey: ["booth", boothId],
    queryFn: async () =>
      await fetcher<SingleBoothResponse>(`/api/booths/${boothId}`).then(
        (res) => res.data
      ),
    enabled: !!boothId,
  });
}
