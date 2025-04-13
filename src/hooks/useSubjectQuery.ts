import { useQuery } from "@tanstack/react-query";
import { getSubjects } from "@/actions/subject";
import { getSubject } from "@/actions/subject/read";
import { getSubjectsCount } from "@/actions/count";

export function useSubjectsCount() {
    return useQuery({
        queryKey: ["subjects", "count"],
        queryFn: () => getSubjectsCount(),
    });
}

export function useSubjects(page: number = 1, pageSize: number = 15) {
    return useQuery({
        queryKey: ["subjects", page, pageSize],
        queryFn: () => getSubjects({ page, pageSize }),
    });
}

export function useSubject(subjectId: string) {
    return useQuery({
        queryKey: ["subjects", subjectId],
        queryFn: () => getSubject(subjectId),
    });
}