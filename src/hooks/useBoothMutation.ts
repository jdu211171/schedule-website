import { createBooth } from "@/actions/booth/create";
import { deleteBooth } from "@/actions/booth/delete";
import { updateBooth } from "@/actions/booth/update";
import { useMutation, useQueryClient } from "@tanstack/react-query";


export function useBoothCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createBooth,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["booths"] });
        }
    });
}

export function useBoothUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateBooth,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["booths"] });
        }
    });
}
export function useBoothDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteBooth,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["booths"] });
        }
    });
}