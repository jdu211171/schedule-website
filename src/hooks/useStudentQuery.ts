import { getStudents } from "@/actions/student";
import { getStudent } from "@/actions/student/read";
import { getStudentsCount } from "@/actions/count";
import { useQuery } from "@tanstack/react-query";
import { Grade, Student, StudentRegularPreference } from "@prisma/client";

export function useStudentsCount() {
  return useQuery({
    queryKey: ["students", "count"],
    queryFn: () => getStudentsCount(),
  });
}

export function useStudents({
  page = 1,
  pageSize = 10,
  teacherId,
}: {
  page?: number;
  pageSize?: number;
  teacherId?: string;
}) {
  return useQuery({
    queryKey: ["students", page, pageSize, teacherId],
    queryFn: () =>
      getStudents({ page, pageSize, teacherId }) as Promise<
        (Student & {
          grade: Grade | null;
          studentRegularPreferences: StudentRegularPreference[];
        })[]
      >,
  });
}

export function useStudent(studentId: string) {
  return useQuery({
    queryKey: ["students", studentId],
    queryFn: () =>
      getStudent(studentId) as Promise<
        Student & { studentRegularPreferences: StudentRegularPreference[] }
      >,
    enabled: !!studentId,
  });
}
