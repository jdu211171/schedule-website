import { useQuery } from "@tanstack/react-query";
import { getSubjectTypes } from "@/actions/subjectType";
import { getSubjectType } from "@/actions/subjectType/read";

export function useSubjectTypes() {
    return useQuery({
        queryKey: ["subjectTypes"],
        queryFn: getSubjectTypes,
    });
}

export function useSubjectType(subjectTypeId: string) {
    return useQuery({
        queryKey: ["subjectTypes", subjectTypeId],
        queryFn: () => getSubjectType(subjectTypeId),
    });
}