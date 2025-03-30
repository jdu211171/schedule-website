import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStudentSubject } from "@/actions/studentSubject/create";
import { updateStudentSubject } from "@/actions/studentSubject/update";
import { deleteStudentSubject } from "@/actions/studentSubject/delete";

export function useStudentSubjectCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createStudentSubject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["studentSubjects"] });
        },
    });
}

export function useStudentSubjectUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateStudentSubject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["studentSubjects"] });
        },
    });
}

export function useStudentSubjectDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ studentId, subjectId }: { studentId: string; subjectId: string }) =>
            deleteStudentSubject(studentId, subjectId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["studentSubjects"] });
        },
    });
}