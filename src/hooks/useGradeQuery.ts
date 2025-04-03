import { getGrades } from "@/actions/grade";
import { getGrade } from "@/actions/grade/read";
import { useQuery } from "@tanstack/react-query";


export function useGrades() {
    return useQuery({
        queryKey: ["grades"],
        queryFn: getGrades,
    });
}

export function useGrade(gradeId: string) {
    return useQuery({
        queryKey: ["grades", gradeId],
        queryFn: () => getGrade(gradeId),
    });
}