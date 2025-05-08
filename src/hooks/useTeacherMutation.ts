import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TeacherWithPreference } from "./useTeacherQuery";
import { toast } from "sonner";
import { DayOfWeekEnum } from "@/schemas/teacher.schema";
import { z } from "zod";

export type DayOfWeek = z.infer<typeof DayOfWeekEnum>;

// Define the subject type pair interface for consistency
export interface SubjectTypePair {
  subjectId: string;
  subjectTypeId: string;
}

// Input for creating a teacher (matches Zod and Prisma)
type CreateTeacherInput = {
  name: string;
  evaluationId: string;
  birthDate: string; // ISO string
  mobileNumber: string;
  email: string;
  highSchool: string;
  university: string;
  faculty: string;
  department: string;
  enrollmentStatus: string;
  otherUniversities?: string | null;
  englishProficiency?: string | null;
  toeic?: number | null;
  toefl?: number | null;
  mathCertification?: string | null;
  kanjiCertification?: string | null;
  otherCertifications?: string | null;
  notes?: string | null;
  username: string;
  password: string;
  subjects?: SubjectTypePair[];
  shifts?: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    notes?: string | null;
  }[];
};

// Input for updating a teacher (matches Zod and Prisma)
type UpdateTeacherInput = {
  teacherId: string;
  name?: string;
  evaluationId?: string;
  birthDate?: string;
  mobileNumber?: string;
  email?: string;
  highSchool?: string;
  university?: string;
  faculty?: string;
  department?: string;
  enrollmentStatus?: string;
  otherUniversities?: string | null;
  englishProficiency?: string | null;
  toeic?: number | null;
  toefl?: number | null;
  mathCertification?: string | null;
  kanjiCertification?: string | null;
  otherCertifications?: string | null;
  notes?: string | null;
  password?: string;
  subjects?: SubjectTypePair[];
  shifts?: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    notes?: string | null;
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
