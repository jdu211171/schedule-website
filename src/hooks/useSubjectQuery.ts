import { useQuery } from "@tanstack/react-query";
import { getSubjects } from "@/actions/subject";
import { getSubject } from "@/actions/subject/read";

export function useSubjects() {
    return useQuery({
        queryKey: ["subjects"],
        queryFn: getSubjects,
    });
}

export function useSubject(subjectId: string) {
    return useQuery({
        queryKey: ["subjects", subjectId],
        queryFn: () => getSubject(subjectId),
    });
}