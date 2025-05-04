import { fetcher } from "@/lib/fetcher";
import {
  CreateStudentTypeInput,
  UpdateStudentTypeInput,
} from "@/schemas/student-type.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StudentType } from "@prisma/client";
import { toast } from "sonner";

type CreateStudentTypeResponse = {
  message: string;
  data: StudentType;
};

type UpdateStudentTypeResponse = {
  message: string;
  data: StudentType;
};

type DeleteStudentTypeResponse = {
  message: string;
};

export function useStudentTypeCreate() {
  const queryClient = useQueryClient();
  return useMutation<CreateStudentTypeResponse, Error, CreateStudentTypeInput>({
    mutationFn: (data) =>
      fetcher("/api/student-type", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["studentType"] });

      toast.success("生徒タイプを追加しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("生徒タイプの追加に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useStudentTypeUpdate() {
  const queryClient = useQueryClient();
  return useMutation<UpdateStudentTypeResponse, Error, UpdateStudentTypeInput>({
    mutationFn: ({ studentTypeId, ...data }) =>
      fetcher(`/api/student-type`, {
        method: "PUT",
        body: JSON.stringify({ studentTypeId, ...data }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["studentType"] });

      toast.success("生徒タイプを更新しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("生徒タイプの更新に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useStudentTypeDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteStudentTypeResponse, Error, string>({
    mutationFn: (studentTypeId) =>
      fetcher(`/api/student-type?studentTypeId=${studentTypeId}`, {
        method: "DELETE",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["studentType"] });

      toast.success("生徒タイプを削除しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("生徒タイプの削除に失敗しました", {
        description: error.message,
      });
    },
  });
}
