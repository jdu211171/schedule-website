import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type CreateStudentPreferenceSubjectInput = {
  studentId: string;
  subjectId: string;
  subjectTypeId: string;
  preferenceId?: string;
  notes?: string;
};

type UpdateStudentPreferenceSubjectInput = {
  id: string;
  notes?: string;
};

type StudentPreferenceSubjectResponse = {
  message: string;
  data: any;
};

type DeleteStudentPreferenceSubjectResponse = {
  message: string;
};

export function useStudentPreferenceSubjectCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    StudentPreferenceSubjectResponse,
    Error,
    CreateStudentPreferenceSubjectInput
  >({
    mutationFn: (data) =>
      fetcher("/api/student-preference-subjects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["studentPreferenceSubjects"],
      });

      toast.success("生徒科目を追加しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("生徒科目の追加に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useStudentPreferenceSubjectUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    StudentPreferenceSubjectResponse,
    Error,
    UpdateStudentPreferenceSubjectInput
  >({
    mutationFn: (data) =>
      fetcher(`/api/student-preference-subjects`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["studentPreferenceSubjects"],
      });

      toast.success("生徒科目を更新しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("生徒科目の更新に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useStudentPreferenceSubjectDelete() {
  const queryClient = useQueryClient();
  return useMutation<
    DeleteStudentPreferenceSubjectResponse,
    Error,
    { id: string }
  >({
    mutationFn: ({ id }) => {
      if (!id) {
        return Promise.reject(new Error("IDは必須です"));
      }

      return fetcher(`/api/student-preference-subjects?id=${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["studentPreferenceSubjects"],
      });
      toast.success("生徒科目を削除しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("生徒科目の削除に失敗しました", {
        description: error.message,
      });
    },
  });
}
