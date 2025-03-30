import { getBooths } from "@/actions/booth";
import { getBooth } from "@/actions/booth/read";
import { useQuery } from "@tanstack/react-query";


export function useBooths() {
    return useQuery({
        queryKey: ["booths"],
        queryFn: getBooths,
    });
}

export function useBooth(boothId: string) {
    return useQuery({
        queryKey: ["booths", boothId],
        queryFn: () => getBooth(boothId),
    });
}