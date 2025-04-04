import { createStudent } from "@/actions/student/create";
import { deleteStudent } from "@/actions/student/delete";
import { updateStudent } from "@/actions/student/update";
import { useMutation, useQueryClient } from "@tanstack/react-query";


export function useStudentCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createStudent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
        }
    });
}

export function useStudentUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateStudent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
        }
    });
}
export function useStudentDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteStudent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
        }
    });
}