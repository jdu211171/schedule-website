import { useQuery } from "@tanstack/react-query";
import { getStudentTypes } from "@/actions/studentType";
import { getStudentTypesCount } from "@/actions/count";

export function useStudentTypesCount() {
    return useQuery({
        queryKey: ["studentTypes", "count"],
        queryFn: () => getStudentTypesCount(),
    });
}

export function useStudentTypes(page: number = 1, pageSize: number = 100) {
    return useQuery({
        queryKey: ["studentTypes", page, pageSize],
        queryFn: () => getStudentTypes({ page, pageSize }),
    });
}