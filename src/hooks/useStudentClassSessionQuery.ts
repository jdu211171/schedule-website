import { Lesson } from "@/app/student/page";
import { fetcher } from "@/lib/fetcher";
import { queryOptions } from "@tanstack/react-query";
export default function createStudentClassSessionsQueryOptions(
  studentId: string
) {
  return queryOptions({
    queryKey: ["student-schedule-class-sessions"],
    queryFn: (): Promise<{ data: Lesson[]; pagination: any }> =>
      fetcher(`/api/class-session?studentId=${studentId}`),
  });
}
