import { fetcher } from "@/lib/fetcher";
import { CreateGradeInput, UpdateGradeInput } from "@/schemas/grade.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Grade } from "@prisma/client";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      queryClient.invalidateQueries({ queryKey: ["grade"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
    },
  });
}
