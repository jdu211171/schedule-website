import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TeacherWithPreference } from "./useTeacherQuery";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
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
