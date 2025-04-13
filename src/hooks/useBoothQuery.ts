import { getBooths } from "@/actions/booth";
import { getBooth } from "@/actions/booth/read";
import { useQuery } from "@tanstack/react-query";


export function useBooths(page: number = 1, pageSize: number = 15) {
    return useQuery({
        queryKey: ["booths", page, pageSize],
        queryFn: () => getBooths({ page, pageSize }),
    });
}

export function useBooth(boothId: string) {
    return useQuery({
        queryKey: ["booths", boothId],
        queryFn: () => getBooth(boothId),
    });
}