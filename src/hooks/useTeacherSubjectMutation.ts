import { fetcher } from "@/lib/fetcher";
import { CreateTeacherSubjectInput, UpdateTeacherSubjectInput } from "@/schemas/teacher-subject.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TeacherSubject } from "@prisma/client";
import { toast } from "sonner";

type CreateTeacherSubjectResponse = {
  message: string;
  data: TeacherSubject;
};

type UpdateTeacherSubjectResponse = {
  message: string;
  data: TeacherSubject;
};

type DeleteTeacherSubjectResponse = {
  message: string;
};

export function useTeacherSubjectCreate() {
  const queryClient = useQueryClient();
  return useMutation<CreateTeacherSubjectResponse, Error, CreateTeacherSubjectInput>({
    mutationFn: (data) =>
      fetcher("/api/teacher-subjects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teacherSubjects"] });

      toast.success("教師科目を追加しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("教師科目の追加に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useTeacherSubjectUpdate() {
  const queryClient = useQueryClient();
  return useMutation<UpdateTeacherSubjectResponse, Error, UpdateTeacherSubjectInput>({
    mutationFn: ({ teacherId, subjectId, ...data }) =>
      fetcher(`/api/teacher-subjects`, {
        method: "PUT",
        body: JSON.stringify({ teacherId, subjectId, ...data }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teacherSubjects"] });

      toast.success("教師科目を更新しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("教師科目の更新に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useTeacherSubjectDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteTeacherSubjectResponse, Error, { teacherId: string; subjectId: string }>({
    mutationFn: ({ teacherId, subjectId }) =>
      fetcher(`/api/teacher-subjects?teacherId=${teacherId}&subjectId=${subjectId}`, {
        method: "DELETE",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teacherSubjects"] });
      toast.success("教師科目を削除しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("教師科目の削除に失敗しました", {
        description: error.message,
      });
    },
  });
}
