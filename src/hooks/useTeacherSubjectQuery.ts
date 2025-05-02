import { fetcher } from "@/lib/fetcher";
import { Prisma } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";

type UseTeacherSubjectsParams = {
  page?: number;
  pageSize?: number;
};

export type TeacherSubjectWithRelations = Prisma.TeacherSubjectGetPayload<{
  include: {
    subject: true;
    teacher: true;
  }
}>

type TeacherSubjectsResponse = {
  data: TeacherSubjectWithRelations[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  };
};

type SingleTeacherSubjectResponse = {
  data: TeacherSubjectWithRelations;
};
export function useTeacherSubjects({ page = 1, pageSize = 15 }: UseTeacherSubjectsParams) {
  return useQuery<TeacherSubjectsResponse>({
    queryKey: ["teacherSubjects", page, pageSize],
    queryFn: async () => {
      const searchParams = new URLSearchParams({ page: String(page), limit: String(pageSize) }).toString();
      return await fetcher<TeacherSubjectsResponse>(`/api/teacher-subjects?${searchParams}`);
    },
  });
}

export function useTeacherSubject(teacherId: string, subjectId: string) {
  return useQuery<TeacherSubjectWithRelations>({
    queryKey: ["teacherSubjects", teacherId, subjectId],
    queryFn: async () => await fetcher<SingleTeacherSubjectResponse>(`/api/teacher-subjects/${teacherId}/${subjectId}`).then((res) => res.data),
    enabled: !!teacherId && !!subjectId,
  });
}
