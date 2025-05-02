import { fetcher } from "@/lib/fetcher";
import { Prisma } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";

type UseTeachersParams = {
  page?: number;
  limit?: number;
  name?: string;
  email?: string;
  university?: string;
  enrollmentStatus?: string;
};

export type TeacherWithPreference = Prisma.TeacherGetPayload<{
  include: Prisma.TeacherInclude;
}>;

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
  const { page = 1, limit = 10, name, email, university, enrollmentStatus } = params;

  const query = {
    page,
    limit,
    name,
    email,
    university,
    enrollmentStatus,
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
    queryKey: ["teachers", page, limit, name, email, university, enrollmentStatus],
    queryFn: async () => await fetcher<TeachersResponse>(`/api/teacher?${searchParams}`),
  });
}

export function useTeacher(teacherId: string) {
  return useQuery<TeacherWithPreference>({
    queryKey: ["teacher", teacherId],
    queryFn: async () => await fetcher<SingleTeacherResponse>(`/api/teacher/${teacherId}`).then((res) => res.data),
    enabled: !!teacherId,
  });
}

export function useTeachersCount() {
  return useQuery({
    queryKey: ["teachers", "count"],
    queryFn: () => fetcher<number>("/api/teacher/count"),
  });
}
