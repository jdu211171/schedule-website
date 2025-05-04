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
  subjectId?: string | string[];
  evaluationId?: string | string[];
  sort?: string;
  order?: "asc" | "desc";
};

export type TeacherWithPreference = Prisma.TeacherGetPayload<{
  include: {
    teacherSubjects: true;
    TeacherShiftReference: true;
    evaluation: true;
    user: true;
  };
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
  const {
    page = 1,
    limit = 10,
    name,
    email,
    university,
    enrollmentStatus,
    subjectId,
    evaluationId,
    sort,
    order,
  } = params;

  // Build search params, supporting array values
  const searchParams = new URLSearchParams();
  if (page) searchParams.set("page", String(page));
  if (limit) searchParams.set("limit", String(limit));
  if (name) searchParams.set("name", name);
  if (email) searchParams.set("email", email);
  if (university) searchParams.set("university", university);
  if (enrollmentStatus) searchParams.set("enrollmentStatus", enrollmentStatus);
  if (sort) searchParams.set("sort", sort);
  if (order) searchParams.set("order", order);

  // Handle array values
  if (subjectId) {
    if (Array.isArray(subjectId)) {
      subjectId.forEach((v) => searchParams.append("subjectId", v));
    } else {
      searchParams.set("subjectId", subjectId);
    }
  }

  if (evaluationId) {
    if (Array.isArray(evaluationId)) {
      evaluationId.forEach((v) => searchParams.append("evaluationId", v));
    } else {
      searchParams.set("evaluationId", evaluationId);
    }
  }

  return useQuery<TeachersResponse>({
    queryKey: [
      "teachers",
      page,
      limit,
      name,
      email,
      university,
      enrollmentStatus,
      subjectId,
      evaluationId,
      sort,
      order,
    ],
    queryFn: async () =>
      await fetcher<TeachersResponse>(
        `/api/teacher?${searchParams.toString()}`
      ),
  });
}

export function useTeacher(teacherId: string) {
  return useQuery<TeacherWithPreference>({
    queryKey: ["teacher", teacherId],
    queryFn: async () =>
      await fetcher<SingleTeacherResponse>(`/api/teacher/${teacherId}`).then(
        (res) => res.data
      ),
    enabled: !!teacherId,
  });
}
