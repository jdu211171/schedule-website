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
  examSchoolType?: string;
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
  const { page = 1, limit = 10, name, schoolName, gradeName, schoolType, examSchoolType, sort, order } = params;

  const searchParams = new URLSearchParams(
    Object.entries({ page, limit, name, schoolName, gradeName, schoolType, examSchoolType, sort, order }).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<StudentsResponse>({
    queryKey: ["students", page, limit, name, schoolName, gradeName, schoolType, examSchoolType, sort, order],
    queryFn: async () => await fetcher<StudentsResponse>(`/api/student?${searchParams}`),
  });
}

export function useStudent(studentId: string) {
  return useQuery<Student>({
    queryKey: ["student", studentId],
    queryFn: async () => await fetcher<SingleStudentResponse>(`/api/student/${studentId}`).then((res) => res.data),
    enabled: !!studentId,
  });
}
