import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Student } from "@prisma/client";
import { toast } from "sonner";

type CreateStudentInput = {
  username: string;
  password: string;
  name: string;
  kanaName?: string;
  gradeId?: string;
  schoolName?: string;
  schoolType?: string;
  examSchoolType?: "ELEMENTARY" | "MIDDLE" | "HIGH" | "UNIVERSITY" | "OTHER";
  examSchoolCategoryType?: "ELEMENTARY" | "MIDDLE" | "HIGH" | "UNIVERSITY" | "OTHER";
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
  examSchoolType?: "ELEMENTARY" | "MIDDLE" | "HIGH" | "UNIVERSITY" | "OTHER";
  examSchoolCategoryType?: "ELEMENTARY" | "MIDDLE" | "HIGH" | "UNIVERSITY" | "OTHER";
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });

      toast.success("生徒を追加しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("生徒の追加に失敗しました", {
        description: error.message,
      });
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });

      toast.success("生徒を更新しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("生徒の更新に失敗しました", {
        description: error.message,
      });
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });

      toast.success("生徒を削除しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("生徒の削除に失敗しました", {
        description: error.message,
      });
    },
  });
}
