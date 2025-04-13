import { useQuery } from "@tanstack/react-query";
import { getSubjectTypes } from "@/actions/subjectType";
import { getSubjectType } from "@/actions/subjectType/read";
import { getSubjectTypesCount } from "@/actions/count";

export function useSubjectTypesCount() {
    return useQuery({
        queryKey: ["subjectTypes", "count"],
        queryFn: () => getSubjectTypesCount(),
    });
}

export function useSubjectTypes(page: number = 1, pageSize: number = 15) {
    return useQuery({
        queryKey: ["subjectTypes", page, pageSize],
        queryFn: () => getSubjectTypes({ page, pageSize }),
    });
}

export function useSubjectType(subjectTypeId: string) {
    return useQuery({
        queryKey: ["subjectTypes", subjectTypeId],
        queryFn: () => getSubjectType(subjectTypeId),
    });
}