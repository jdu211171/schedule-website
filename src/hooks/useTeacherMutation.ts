import { fetcher } from "@/lib/fetcher";
import { CreateTeacherInput, UpdateTeacherInput } from "@/schemas/teacher.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Teacher } from "@prisma/client";

type CreateTeacherResponse = {
  message: string;
  data: Teacher;
};

type UpdateTeacherResponse = {
  message: string;
  data: Teacher;
};

type DeleteTeacherResponse = {
  message: string;
};

export function useTeacherCreate() {
  const queryClient = useQueryClient();
  return useMutation<CreateTeacherResponse, Error, CreateTeacherInput>({
    mutationFn: (data) =>
      fetcher("/api/teacher", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });
}

export function useTeacherUpdate() {
  const queryClient = useQueryClient();
  return useMutation<UpdateTeacherResponse, Error, UpdateTeacherInput>({
    mutationFn: ({ teacherId, ...data }) =>
      fetcher(`/api/teacher`, {
        method: "PUT",
        body: JSON.stringify({ teacherId, ...data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });
}

export function useTeacherDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteTeacherResponse, Error, string>({
    mutationFn: (teacherId) =>
      fetcher(`/api/teacher?teacherId=${teacherId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });
}
