import { createGrade } from "@/actions/grade/create";
import { deleteGrade } from "@/actions/grade/delete";
import { updateGrade } from "@/actions/grade/update";
import { useMutation, useQueryClient } from "@tanstack/react-query";


export function useGradeCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createGrade,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grades"] });
        }
    });
}

export function useGradeUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateGrade,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grades"] });
        }
    });
}
export function useGradeDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteGrade,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grades"] });
        }
    });
}