import { getStudents } from "@/actions/student";
import { getStudent } from "@/actions/student/read";
import { useQuery } from "@tanstack/react-query";


export function useStudents() {
    return useQuery({
        queryKey: ["students"],
        queryFn: getStudents,
    });
}

export function useStudent(studentId: string) {
    return useQuery({
        queryKey: ["students", studentId],
        queryFn: () => getStudent(studentId),
    });
}