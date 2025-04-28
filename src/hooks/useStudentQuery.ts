import { getStudents, StudentWithDetails } from "@/actions/student";
import { getStudent } from "@/actions/student/read";
import { getStudentsCount } from "@/actions/count";
import { useQuery } from "@tanstack/react-query";
import { Student } from "@prisma/client";

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
        StudentWithDetails[]
      >,
  });
}

export function useStudent(studentId: string) {
  return useQuery({
    queryKey: ["students", studentId],
    queryFn: () =>
      getStudent(studentId) as Promise<
        Student & {
          preference: {
            preferredSubjects: string[];
            preferredTeachers: string[];
            desiredTimes: {
              dayOfWeek: string;
              startTime: Date;
              endTime: Date;
            }[];
            additionalNotes: string | null;
            classTypeId: string | null;
          } | null;
        }
      >,
    enabled: !!studentId,
  });
}
