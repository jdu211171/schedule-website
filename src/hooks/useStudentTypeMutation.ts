import { fetcher } from "@/lib/fetcher";
import {
  CreateStudentTypeInput,
  UpdateStudentTypeInput,
} from "@/schemas/student-type.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StudentType } from "@prisma/client";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentType"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentType"] });
      queryClient.invalidateQueries({ queryKey: ["studentTypeDetail"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentType"] });
    },
  });
}
