import { fetcher } from "@/lib/fetcher";
import { CreateBoothInput, UpdateBoothInput } from "@/schemas/booth.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Booth } from "@prisma/client";
import { toast } from "sonner";

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["booths"] });

      toast.success("ブースを追加しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("ブースの追加に失敗しました", {
        description: error.message,
      });
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["booths"] });

      toast.success("ブースを更新しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("ブースの更新に失敗しました", {
        description: error.message,
      });
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["booths"] });

      toast.success("ブースを削除しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("ブースの削除に失敗しました", {
        description: error.message,
      });
    },
  });
}
