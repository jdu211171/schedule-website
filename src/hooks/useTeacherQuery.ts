import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { TeacherQuerySchema } from "@/schemas/teacher.schema";
import { Teacher } from "@prisma/client";

type UseTeachersParams = {
  page?: number;
  limit?: number;
  name?: string;
  sort?: string;
  order?: "asc" | "desc";
};

type TeachersResponse = {
  data: Teacher[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleTeacherResponse = {
  data: Teacher;
};

export function useTeachers(params: UseTeachersParams = {}) {
  const { page = 1, limit = 10, name, sort, order } = params;

  const query = TeacherQuerySchema.parse({page, limit, name, sort, order});
  const searchParams = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<TeachersResponse>({
    queryKey: ["teachers", page, limit, name, sort, order],
    queryFn: () => fetcher(`/api/teacher?${searchParams}`),
  });
}

export function useTeacher(teacherId: string) {
  return useQuery<Teacher>({
    queryKey: ["teacher", teacherId],
    queryFn: () => fetcher<SingleTeacherResponse>(`/api/teacher/${teacherId}`).then((res) => res.data),
    enabled: !!teacherId,
  });
}
