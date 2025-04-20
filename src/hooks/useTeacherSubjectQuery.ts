import { useQuery } from "@tanstack/react-query";
import { getTeacherSubjects } from "@/actions/teacherSubject";
import { getTeacherSubject } from "@/actions/teacherSubject/read";
import { getTeacherSubjectsCount } from "@/actions/count";

export function useTeacherSubjectsCount() {
    return useQuery({
        queryKey: ["teacherSubjects", "count"],
        queryFn: () => getTeacherSubjectsCount(),
    });
}

export function useTeacherSubjects(page: number = 1, pageSize: number = 15) {
    return useQuery({
        queryKey: ["teacherSubjects", page, pageSize],
        queryFn: () => getTeacherSubjects({ page, pageSize }),
    });
}

export function useTeacherSubject(teacherId: string, subjectId: string) {
    return useQuery({
        queryKey: ["teacherSubjects", teacherId, subjectId],
        queryFn: () => getTeacherSubject(teacherId, subjectId),
    });
}