import { useQuery } from "@tanstack/react-query";
import { getTeachers } from "@/actions/teacher";
import { getTeacher } from "@/actions/teacher/read";
import { getTeachersCount } from "@/actions/count";
import { TeacherWithPreference } from "@/schemas/teacher.schema";

export function useTeachersCount() {
  return useQuery({
    queryKey: ["teachers", "count"],
    queryFn: () => getTeachersCount(),
  });
}

export function useTeachers({
  page = 1,
  pageSize = 10,
  studentId,
}: {
  page?: number;
  pageSize?: number;
  studentId?: string;
}) {
  return useQuery({
    queryKey: ["teachers", page, pageSize, studentId],
    queryFn: () => getTeachers({ page, pageSize, studentId }),
  });
}

export function useTeacher(teacherId: string) {
  return useQuery({
    queryKey: ["teachers", teacherId],
    queryFn: () => getTeacher(teacherId) as Promise<TeacherWithPreference>,
    enabled: !!teacherId,
  });
}
