import { fetcher } from "@/lib/fetcher";
import { CreateClassTypeInput, UpdateClassTypeInput } from "@/schemas/class-type.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClassType } from "@prisma/client";
import { toast } from "sonner";

type CreateClassTypeResponse = {
  message: string;
  data: ClassType;
};

type UpdateClassTypeResponse = {
  message: string;
  data: ClassType;
};

type DeleteClassTypeResponse = {
  message: string;
};

export function useClassTypeCreate() {
  const queryClient = useQueryClient();
  return useMutation<CreateClassTypeResponse, Error, CreateClassTypeInput>({
    mutationFn: (data) =>
      fetcher("/api/class-type", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["classTypes"] });

      toast.success("クラスの種類が正常に作成されました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("クラスの種類の作成に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useClassTypeUpdate() {
  const queryClient = useQueryClient();
  return useMutation<UpdateClassTypeResponse, Error, UpdateClassTypeInput>({
    mutationFn: ({ classTypeId, ...data }) =>
      fetcher(`/api/class-type`, {
        method: "PUT",
        body: JSON.stringify({ classTypeId, ...data }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["classTypes"] });

      toast.success("クラスの種類が正常に更新されました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("クラスの種類の更新に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useClassTypeDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteClassTypeResponse, Error, string>({
    mutationFn: (classTypeId) =>
      fetcher(`/api/class-type?classTypeId=${classTypeId}`, {
        method: "DELETE",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["classTypes"] });

      toast.success("クラスの種類が正常に削除されました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("クラスの種類の削除に失敗しました", {
        description: error.message,
      });
    },
  });
}
