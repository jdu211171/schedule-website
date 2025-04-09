import { createSchedule } from "@/actions/schedule/create";
import { updateSchedule } from "@/actions/schedule/update";
import { deleteSchedule } from "@/actions/schedule/delete";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useScheduleCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["schedules"] });
        },
    });
}

export function useScheduleUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["schedules"] });
        },
    });
}

export function useScheduleDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["schedules"] });
        },
    });
}
