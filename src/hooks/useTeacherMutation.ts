import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTeacher } from '@/actions/teacher/create';
import { updateTeacher } from '@/actions/teacher/update';
import { deleteTeacher } from '@/actions/teacher/delete';

export function useTeacherCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTeacher,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teachers"] });
        },
    });
}

export function useTeacherUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTeacher,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teachers"] });
        },
    });
}

export function useTeacherDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTeacher,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teachers"] });
        },
    });
}