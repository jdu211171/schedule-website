import { fetcher } from "@/lib/fetcher";
import { CreateSubjectInput, UpdateSubjectInput } from "@/schemas/subject.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Subject } from "@prisma/client";

type CreateSubjectResponse = {
  message: string;
  data: Subject;
};

type UpdateSubjectResponse = {
  message: string;
  data: Subject;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}
