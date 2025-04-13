import { getGrades } from "@/actions/grade";
import { getGrade } from "@/actions/grade/read";
import { useQuery } from "@tanstack/react-query";


export function useGrades(page: number = 1, pageSize: number = 15) {
    return useQuery({
        queryKey: ["grades", page, pageSize],
        queryFn: () => getGrades({ page, pageSize }),
    });
}

export function useGrade(gradeId: string) {
    return useQuery({
        queryKey: ["grades", gradeId],
        queryFn: () => getGrade(gradeId),
    });
}