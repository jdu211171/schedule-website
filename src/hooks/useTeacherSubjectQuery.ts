import { useQuery } from "@tanstack/react-query";
import { getTeacherSubjects } from "@/actions/teacherSubject";
import { getTeacherSubject } from "@/actions/teacherSubject/read";

export function useTeacherSubjects() {
    return useQuery({
        queryKey: ["teacherSubjects"],
        queryFn: getTeacherSubjects,
    });
}

export function useTeacherSubject(teacherId: string, subjectId: string) {
    return useQuery({
        queryKey: ["teacherSubjects", teacherId, subjectId],
        queryFn: () => getTeacherSubject(teacherId, subjectId),
    });
}