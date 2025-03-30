import { useQuery } from "@tanstack/react-query";
import { getStudentSubjects } from "@/actions/studentSubject";
import { getStudentSubject } from "@/actions/studentSubject/read";

export function useStudentSubjects() {
    return useQuery({
        queryKey: ["studentSubjects"],
        queryFn: getStudentSubjects,
    });
}

export function useStudentSubject(studentId: string, subjectId: string) {
    return useQuery({
        queryKey: ["studentSubjects", studentId, subjectId],
        queryFn: () => getStudentSubject(studentId, subjectId),
    });
}