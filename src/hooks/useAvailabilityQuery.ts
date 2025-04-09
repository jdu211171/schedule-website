import { checkTeacherAvailability } from "@/actions/schedule/checkAvailability";
import { useQuery } from "@tanstack/react-query";

export function useTeacherAvailability(
    teacherId: string,
    date: string,
    startTime: string,
    endTime: string
) {
    return useQuery({
        queryKey: ["availability", teacherId, date, startTime, endTime],
        queryFn: () => checkTeacherAvailability({ teacherId, date, startTime, endTime }),
        enabled: !!teacherId && !!date && !!startTime && !!endTime,
    });
}
