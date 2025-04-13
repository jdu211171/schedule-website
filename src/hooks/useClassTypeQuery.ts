import { getClassTypes } from "@/actions/classType";
import { getClassType } from "@/actions/classType/read";
import { useQuery } from "@tanstack/react-query";


export function useClassTypes(page: number = 1, pageSize: number = 15) {
    return useQuery({
        queryKey: ["classTypes", page, pageSize],
        queryFn: () => getClassTypes({ page, pageSize }),
    });
}

export function useClassType(classTypeId: string) {
    return useQuery({
        queryKey: ["classTypes", classTypeId],
        queryFn: () => getClassType(classTypeId),
    });
}