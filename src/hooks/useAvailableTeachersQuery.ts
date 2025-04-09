import { getAvailableTeachersForSubject } from "@/actions/schedule/getAvailableTeachersForSubject";
import { useQuery } from "@tanstack/react-query";

export function useAvailableTeachersForSubject(
    subjectId: string,
    date: string,
    startTime: string,
    endTime: string
) {
    return useQuery({
        queryKey: ["availableTeachers", subjectId, date, startTime, endTime],
        queryFn: () => getAvailableTeachersForSubject(subjectId, date, startTime, endTime),
        enabled: !!subjectId && !!date && !!startTime && !!endTime,
    });
}
