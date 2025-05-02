import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Student } from "@prisma/client";

type CreateStudentInput = {
  username: string;
  password: string;
  name: string;
  kanaName?: string;
  gradeId?: string;
  schoolName?: string;
  schoolType?: string;
  examSchoolType?: string;
  birthDate?: string;
  parentEmail?: string;
  preferences?: {
    subjects?: string[];
    teachers?: string[];
    timeSlots?: {
      dayOfWeek: string;
      startTime: string;
      endTime: string;
    }[];
    notes?: string;
    classTypeId?: string;
  };
};

type UpdateStudentInput = {
  studentId: string;
  password?: string;
  name?: string;
  kanaName?: string;
  gradeId?: string;
  schoolName?: string;
  schoolType?: string;
  examSchoolType?: string;
  birthDate?: string;
  parentEmail?: string;
  preferences?: {
    subjects?: string[];
    teachers?: string[];
    timeSlots?: {
      dayOfWeek: string;
      startTime: string;
      endTime: string;
    }[];
    notes?: string;
    classTypeId?: string;
  };
};

type CreateStudentResponse = {
  message: string;
  data: Student;
};

type UpdateStudentResponse = {
  message: string;
  data: Student;
};

type DeleteStudentResponse = {
  message: string;
};

export function useStudentCreate() {
  const queryClient = useQueryClient();
  return useMutation<CreateStudentResponse, Error, CreateStudentInput>({
    mutationFn: (data) =>
      fetcher("/api/student", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useStudentUpdate() {
  const queryClient = useQueryClient();
  return useMutation<UpdateStudentResponse, Error, UpdateStudentInput>({
    mutationFn: (data) =>
      fetcher(`/api/student`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useStudentDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteStudentResponse, Error, string>({
    mutationFn: (studentId) =>
      fetcher(`/api/student?studentId=${studentId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
