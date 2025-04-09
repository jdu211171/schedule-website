import { getStudentSubjects } from "@/actions/schedule/getStudentSubjects";
import { useQuery } from "@tanstack/react-query";

export function useStudentSubjects(studentId: string) {
    return useQuery({
        queryKey: ["studentSubjects", studentId],
        queryFn: () => getStudentSubjects(studentId),
        enabled: !!studentId, // Only fetch if studentId is provided
    });
}
