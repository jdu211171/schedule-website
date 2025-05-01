import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { TeacherWithPreference } from "@/schemas/teacher.schema";

type UseTeachersParams = {
  page?: number;
  pageSize?: number;
  studentId?: string;
};

type TeachersResponse = {
  data: TeacherWithPreference[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  };
};

type SingleTeacherResponse = {
  data: TeacherWithPreference;
};

export function useTeachers(params: UseTeachersParams = {}) {
  const { page = 1, pageSize = 10, studentId } = params;

  const query = {
    page,
    pageSize,
    studentId,
  };

  const searchParams = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<TeachersResponse>({
    queryKey: ["teachers", page, pageSize, studentId],
    queryFn: async () => await fetcher<TeachersResponse>(`/api/teachers?${searchParams}`),
  });
}

export function useTeacher(teacherId: string) {
  return useQuery<TeacherWithPreference>({
    queryKey: ["teacher", teacherId],
    queryFn: async () => await fetcher<SingleTeacherResponse>(`/api/teachers/${teacherId}`).then((res) => res.data),
    enabled: !!teacherId,
  });
}

export function useTeachersCount() {
  return useQuery({
    queryKey: ["teachers", "count"],
    queryFn: () => fetcher<number>("/api/teachers/count"),
  });
}
