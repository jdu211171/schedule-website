import { fetcher } from "@/lib/fetcher";
import {
  CreateSubjectTypeInput,
  UpdateSubjectTypeInput,
} from "@/schemas/subject-type.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SubjectType } from "@prisma/client";
import { toast } from "sonner";

type CreateSubjectTypeResponse = {
  message: string;
  data: SubjectType;
};

type UpdateSubjectTypeResponse = {
  message: string;
  data: SubjectType;
};

type DeleteSubjectTypeResponse = {
  message: string;
};

export function useSubjectTypeCreate() {
  const queryClient = useQueryClient();
  return useMutation<CreateSubjectTypeResponse, Error, CreateSubjectTypeInput>({
    mutationFn: (data) =>
      fetcher("/api/subject-type", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subjectType"] });

      toast.success("科目タイプを追加しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("科目タイプの追加に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useSubjectTypeUpdate() {
  const queryClient = useQueryClient();
  return useMutation<UpdateSubjectTypeResponse, Error, UpdateSubjectTypeInput>({
    mutationFn: ({ subjectTypeId, ...data }) =>
      fetcher(`/api/subject-type`, {
        method: "PUT",
        body: JSON.stringify({ subjectTypeId, ...data }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subjectType"] });

      toast.success("科目タイプを更新しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("科目タイプの更新に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useSubjectTypeDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteSubjectTypeResponse, Error, string>({
    mutationFn: (subjectTypeId) =>
      fetcher(`/api/subject-type?subjectTypeId=${subjectTypeId}`, {
        method: "DELETE",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subjectType"] });

      toast.success("科目タイプを削除しました", {
        description: data.message,
      });
    },
  });
}
