import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";

export function useBoothsCount() {
  return useQuery({
    queryKey: ["booths", "count"],
    queryFn: () => fetcher<number>("/api/booth?count=true"),
  });
}

type UseBoothsParams = {
  page?: number;
  limit?: number;
  name?: string;
  status?: boolean;
  sort?: string;
  order?: "asc" | "desc";
};

export function useBooths(params: UseBoothsParams = {}) {
  const { page = 1, limit = 10, name, status, sort = "id", order = "asc" } = params;

  return useQuery({
    queryKey: ["booths", page, limit, name, status, sort, order],
    queryFn: () =>
      fetcher("/api/booth", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page, limit, name, status, sort, order }),
      }),
  });
}

export function useBooth(boothId: string) {
  return useQuery({
    queryKey: ["booth", boothId],
    queryFn: () => fetcher(`/api/booth?boothId=${boothId}`),
  });
}
