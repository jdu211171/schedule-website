import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTeacherSubject } from "@/actions/teacherSubject/create";
import { updateTeacherSubject } from "@/actions/teacherSubject/update";
import { deleteTeacherSubject } from "@/actions/teacherSubject/delete";

export function useTeacherSubjectCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTeacherSubject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teacherSubjects"] });
        },
    });
}

export function useTeacherSubjectUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTeacherSubject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teacherSubjects"] });
        },
    });
}

export function useTeacherSubjectDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ teacherId, subjectId }: { teacherId: string; subjectId: string }) =>
            deleteTeacherSubject(teacherId, subjectId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teacherSubjects"] });
        },
    });
}