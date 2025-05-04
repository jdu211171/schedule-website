import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { Student } from "@prisma/client";
import { StudentWithGrade } from "@/schemas/student.schema";

type UseStudentsParams = {
  page?: number;
  limit?: number;
  name?: string;
  schoolName?: string;
  gradeName?: string;
  schoolType?: string;
  examSchoolType?: string | string[];
  examSchoolCategoryType?: string | string[];
  sort?: string;
  order?: "asc" | "desc";
};

type StudentsResponse = {
  data: StudentWithGrade[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleStudentResponse = {
  data: Student;
};

export function useStudents(params: UseStudentsParams = {}) {
  const { page = 1, limit = 10, name, schoolName, gradeName, schoolType, examSchoolType, examSchoolCategoryType, sort, order } = params;

  // Build search params, supporting array values for examSchoolType and examSchoolCategoryType
  const searchParams = new URLSearchParams();
  if (page) searchParams.set("page", String(page));
  if (limit) searchParams.set("limit", String(limit));
  if (name) searchParams.set("name", name);
  if (schoolName) searchParams.set("schoolName", schoolName);
  if (gradeName) searchParams.set("gradeName", gradeName);
  if (schoolType) searchParams.set("schoolType", schoolType);
  if (sort) searchParams.set("sort", sort);
  if (order) searchParams.set("order", order);
  if (examSchoolType) {
    if (Array.isArray(examSchoolType)) {
      examSchoolType.forEach((v) => searchParams.append("examSchoolType", v));
    } else {
      searchParams.set("examSchoolType", examSchoolType);
    }
  }
  if (examSchoolCategoryType) {
    if (Array.isArray(examSchoolCategoryType)) {
      examSchoolCategoryType.forEach((v) => searchParams.append("examSchoolCategoryType", v));
    } else {
      searchParams.set("examSchoolCategoryType", examSchoolCategoryType);
    }
  }

  return useQuery<StudentsResponse>({
    queryKey: ["students", page, limit, name, schoolName, gradeName, schoolType, examSchoolType, examSchoolCategoryType, sort, order],
    queryFn: async () => await fetcher<StudentsResponse>(`/api/student?${searchParams.toString()}`),
  });
}

export function useStudent(studentId: string) {
  return useQuery<Student>({
    queryKey: ["student", studentId],
    queryFn: async () => await fetcher<SingleStudentResponse>(`/api/student/${studentId}`).then((res) => res.data),
    enabled: !!studentId,
  });
}
