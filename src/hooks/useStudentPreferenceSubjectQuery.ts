import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";

type UseStudentPreferenceSubjectsParams = {
  page?: number;
  pageSize?: number;
  studentId?: string;
};

export type StudentPreferenceSubjectWithRelations = {
  id: string;
  preferenceId: string;
  subjectId: string;
  subjectTypeId: string;
  notes?: string;
  studentPreference: {
    student: {
      studentId: string;
      name: string;
    };
  };
  subject: {
    subjectId: string;
    name: string;
  };
  subjectType: {
    subjectTypeId: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
};

type StudentPreferenceSubjectsResponse = {
  data: StudentPreferenceSubjectWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleStudentPreferenceSubjectResponse = {
  data: StudentPreferenceSubjectWithRelations;
};

export function useStudentPreferenceSubjects({
  page = 1,
  pageSize = 15,
  studentId,
}: UseStudentPreferenceSubjectsParams = {}) {
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
  });

  if (studentId) {
    queryParams.append("studentId", studentId);
  }

  return useQuery<StudentPreferenceSubjectsResponse>({
    queryKey: ["studentPreferenceSubjects", page, pageSize, studentId],
    queryFn: async () => {
      return await fetcher<StudentPreferenceSubjectsResponse>(
        `/api/student-preference-subjects?${queryParams.toString()}`
      );
    },
  });
}

export function useStudentPreferenceSubject(id: string) {
  return useQuery<StudentPreferenceSubjectWithRelations>({
    queryKey: ["studentPreferenceSubjects", id],
    queryFn: async () =>
      await fetcher<SingleStudentPreferenceSubjectResponse>(
        `/api/student-preference-subjects/${id}`
      ).then((res) => res.data),
    enabled: !!id,
  });
}
