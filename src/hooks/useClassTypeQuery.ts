import { getClassTypes } from "@/actions/classType";
import { getClassType } from "@/actions/classType/read";
import { useQuery } from "@tanstack/react-query";


export function useClassTypes() {
    return useQuery({
        queryKey: ["classTypes"],
        queryFn: getClassTypes,
    });
}

export function useClassType(classTypeId: string) {
    return useQuery({
        queryKey: ["classTypes", classTypeId],
        queryFn: () => getClassType(classTypeId),
    });
}