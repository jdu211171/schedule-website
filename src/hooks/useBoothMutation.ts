import { fetcher } from "@/lib/fetcher";
import { UpdateBoothInput } from "@/schemas/booth.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useBoothCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => fetcher("/api/booth", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booths"] });
    },
  });
}

export function useBoothUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boothId, ...data }: UpdateBoothInput) => fetcher(`/api/booth`, {
      method: "PUT",
      body: JSON.stringify({ boothId, ...data }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booths"] });
    },
  });
}

export function useBoothDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (boothId) => fetcher(`/api/booth?boothId=${boothId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booths"] });
    },
  });
}
