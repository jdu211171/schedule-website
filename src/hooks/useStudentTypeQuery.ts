import { useQuery } from "@tanstack/react-query";

export function useStudentTypesCount() {
    return useQuery({
        queryKey: ["studentTypes", "count"],
        queryFn: () => console.log("Fetching student types count..."),
    });
}

export function useStudentTypes(page: number = 1, pageSize: number = 10) {
    return useQuery({
        queryKey: ["studentTypes", page, pageSize],
        queryFn: () => console.log("Fetching student types count..."),
    });
}

export function useStudentType(studentTypeId: string) {
    return useQuery({
        queryKey: ["studentTypes", studentTypeId],
        queryFn: () => console.log("Fetching student types count..."),
    });
}
