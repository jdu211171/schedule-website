import { fetcher } from "@/lib/fetcher";
import {
  CreateSubjectInput,
  UpdateSubjectInput,
  SubjectWithRelations,
} from "@/schemas/subject.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type CreateSubjectResponse = {
  message: string;
  data: SubjectWithRelations;
};

type UpdateSubjectResponse = {
  message: string;
  data: SubjectWithRelations;
};

type DeleteSubjectResponse = {
  message: string;
};

export function useSubjectCreate() {
  const queryClient = useQueryClient();
  return useMutation<CreateSubjectResponse, Error, CreateSubjectInput>({
    mutationFn: (data) =>
      fetcher("/api/subjects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });

      toast.success("科目を追加しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("科目の追加に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useSubjectUpdate() {
  const queryClient = useQueryClient();
  return useMutation<UpdateSubjectResponse, Error, UpdateSubjectInput>({
    mutationFn: ({ subjectId, ...data }) =>
      fetcher(`/api/subjects`, {
        method: "PUT",
        body: JSON.stringify({ subjectId, ...data }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });

      toast.success("科目を更新しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("科目の更新に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useSubjectDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteSubjectResponse, Error, string>({
    mutationFn: (subjectId) =>
      fetcher(`/api/subjects?subjectId=${subjectId}`, {
        method: "DELETE",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });

      toast.success("科目を削除しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("科目の削除に失敗しました", {
        description: error.message,
      });
    },
  });
}
