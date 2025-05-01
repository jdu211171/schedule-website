import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { TeacherSubject } from "@prisma/client";

type UseTeacherSubjectsParams = {
  page?: number;
  pageSize?: number;
};

type TeacherSubjectsResponse = {
  data: TeacherSubject[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  };
};

type SingleTeacherSubjectResponse = {
  data: TeacherSubject;
};

export function useTeacherSubjectsCount() {
  return useQuery({
    queryKey: ["teacherSubjects", "count"],
    queryFn: async () => await fetcher<{ count: number }>("/api/teacher-subjects/count"),
  });
}

export function useTeacherSubjects({ page = 1, pageSize = 15 }: UseTeacherSubjectsParams) {
  return useQuery<TeacherSubjectsResponse>({
    queryKey: ["teacherSubjects", page, pageSize],
    queryFn: async () => {
      const searchParams = new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
      return await fetcher<TeacherSubjectsResponse>(`/api/teacher-subjects?${searchParams}`);
    },
  });
}

export function useTeacherSubject(teacherId: string, subjectId: string) {
  return useQuery<TeacherSubject>({
    queryKey: ["teacherSubjects", teacherId, subjectId],
    queryFn: async () => await fetcher<SingleTeacherSubjectResponse>(`/api/teacher-subjects/${teacherId}/${subjectId}`).then((res) => res.data),
    enabled: !!teacherId && !!subjectId,
  });
}
