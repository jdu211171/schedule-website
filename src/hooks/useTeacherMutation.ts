import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TeacherWithPreference } from "./useTeacherQuery";
import { toast } from "sonner";

type CreateTeacherInput = {
  name: string;
  evaluationId: string;
  birthDate: Date | string;
  mobileNumber: string;
  email: string;
  highSchool: string;
  university: string;
  faculty: string;
  department: string;
  enrollmentStatus: string;
  otherUniversities?: string;
  englishProficiency?: string;
  toeic?: number;
  toefl?: number;
  mathCertification?: string;
  kanjiCertification?: string;
  otherCertifications?: string;
  notes?: string;
  username: string;
  password?: string;
  subjects?: string[];
  shifts?: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    notes?: string;
  }[];
};

type UpdateTeacherInput = {
  teacherId: string;
  name?: string;
  evaluationId?: string;
  birthDate?: Date | string;
  mobileNumber?: string;
  email?: string;
  highSchool?: string;
  university?: string;
  faculty?: string;
  department?: string;
  enrollmentStatus?: string;
  otherUniversities?: string;
  englishProficiency?: string;
  toeic?: number;
  toefl?: number;
  mathCertification?: string;
  kanjiCertification?: string;
  otherCertifications?: string;
  notes?: string;
  password?: string;
  subjects?: string[];
  shifts?: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    notes?: string;
  }[];
};

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
  return useMutation<CreateTeacherResponse, Error, CreateTeacherInput>({
    mutationFn: (data) => {
      // The data is already in the expected format, no need to transform
      return fetcher("/api/teacher", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });

      toast.success("教師を追加しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("教師の追加に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useTeacherUpdate() {
  const queryClient = useQueryClient();
  return useMutation<UpdateTeacherResponse, Error, UpdateTeacherInput>({
    mutationFn: (data) => {
      // The data is already in the expected format, no need to transform
      return fetcher(`/api/teacher`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });

      toast.success("教師を更新しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("教師の更新に失敗しました", {
        description: error.message,
      });
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });

      toast.success("教師を削除しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("教師の削除に失敗しました", {
        description: error.message,
      });
    },
  });
}
