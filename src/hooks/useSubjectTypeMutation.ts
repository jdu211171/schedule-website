import { fetcher } from "@/lib/fetcher";
import {
  CreateSubjectTypeInput,
  UpdateSubjectTypeInput,
} from "@/schemas/subject-type.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SubjectType } from "@prisma/client";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjectType"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjectType"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjectType"] });
    },
  });
}