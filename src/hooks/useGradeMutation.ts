import { fetcher } from "@/lib/fetcher";
import { CreateGradeInput, UpdateGradeInput } from "@/schemas/grade.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Grade } from "@prisma/client";
import { toast } from "sonner";

type CreateGradeResponse = {
  message: string;
  data: Grade;
};

type UpdateGradeResponse = {
  message: string;
  data: Grade;
};

type DeleteGradeResponse = {
  message: string;
};

export function useGradeCreate() {
  const queryClient = useQueryClient();
  return useMutation<CreateGradeResponse, Error, CreateGradeInput>({
    mutationFn: (data) =>
      fetcher("/api/grades", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });

      toast.success("学年を追加しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("学年の追加に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useGradeUpdate() {
  const queryClient = useQueryClient();
  return useMutation<UpdateGradeResponse, Error, UpdateGradeInput>({
    mutationFn: ({ gradeId, ...data }) =>
      fetcher(`/api/grades`, {
        method: "PUT",
        body: JSON.stringify({ gradeId, ...data }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });

      toast.success("学年を更新しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("学年の更新に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useGradeDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteGradeResponse, Error, string>({
    mutationFn: (gradeId) =>
      fetcher(`/api/grades?gradeId=${gradeId}`, {
        method: "DELETE",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });

      toast.success("学年を削除しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("学年の削除に失敗しました", {
        description: error.message,
      });
    },
  });
}
