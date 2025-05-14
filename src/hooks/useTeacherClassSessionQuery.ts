import { Lesson } from "@/app/teacher/page";
import { fetcher } from "@/lib/fetcher";
import { queryOptions } from "@tanstack/react-query";

export default function createTeacherClassSessionsQueryOptions(
  teacherId: string
) {
  return queryOptions({
    queryKey: ["teacher-schedule-class-sessions", teacherId],
    queryFn: (): Promise<{ data: Lesson[]; pagination: any }> =>
      fetcher(`/api/class-session?teacherId=${teacherId}`),
  });
}
