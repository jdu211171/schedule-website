import { getBooths } from "@/actions/booth";
import { getBooth } from "@/actions/booth/read";
import { getBoothsCount } from "@/actions/count";
import { useQuery } from "@tanstack/react-query";

export function useBoothsCount() {
  return useQuery({
    queryKey: ["booths", "count"],
    queryFn: () => getBoothsCount(),
  });
}

export function useBooths(
  weekday: string,
  startTime: string,
  endTime: string,
  page: number = 1,
  pageSize: number = 15
) {
  return useQuery({
    queryKey: ["booths", weekday, startTime, endTime, page, pageSize],
    queryFn: () => getBooths({ weekday, startTime, endTime, page, pageSize }),
  });
}

export function useBooth(boothId: string) {
  return useQuery({
    queryKey: ["booths", boothId],
    queryFn: () => getBooth(boothId),
  });
}
