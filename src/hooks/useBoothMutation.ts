import { fetcher } from "@/lib/fetcher";
import { CreateBoothInput, UpdateBoothInput } from "@/schemas/booth.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Booth } from "@prisma/client";

type CreateBoothResponse = {
  message: string;
  data: Booth;
};

type UpdateBoothResponse = {
  message: string;
  data: Booth;
};

type DeleteBoothResponse = {
  message: string;
};

export function useBoothCreate() {
  const queryClient = useQueryClient();
  return useMutation<CreateBoothResponse, Error, CreateBoothInput>({
    mutationFn: (data) =>
      fetcher("/api/booth", {
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
  return useMutation<UpdateBoothResponse, Error, UpdateBoothInput>({
    mutationFn: ({ boothId, ...data }) =>
      fetcher(`/api/booth`, {
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
  return useMutation<DeleteBoothResponse, Error, string>({
    mutationFn: (boothId) =>
      fetcher(`/api/booth?boothId=${boothId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booths"] });
    },
  });
}
