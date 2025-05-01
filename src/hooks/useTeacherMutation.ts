import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateTeacherWithShiftInput, UpdateTeacherWithShiftInput } from "@/schemas/teacher.schema";
import { TeacherWithPreference } from "@/schemas/teacher.schema";

type CreateTeacherResponse = {
  message: string;
  data: TeacherWithPreference;
};

type UpdateTeacherResponse = {
  message: string;
  data: TeacherWithPreference;
};

type DeleteTeacherResponse = {
  message: string;
};

export function useTeacherCreate() {
  const queryClient = useQueryClient();
  return useMutation<CreateTeacherResponse, Error, CreateTeacherWithShiftInput>({
    mutationFn: (data) =>
      fetcher("/api/teachers", {
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
  return useMutation<UpdateTeacherResponse, Error, UpdateTeacherWithShiftInput>({
    mutationFn: (data) =>
      fetcher("/api/teachers", {
        method: "PUT",
        body: JSON.stringify(data),
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
      fetcher(`/api/teachers?teacherId=${teacherId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });
}
