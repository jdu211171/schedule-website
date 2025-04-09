import { getSchedule } from "@/actions/schedule/read";
import { useQuery } from "@tanstack/react-query";

export function useSchedule(classId: string) {
    return useQuery({
        queryKey: ["schedule", classId],
        queryFn: () => getSchedule(classId),
    });
}
