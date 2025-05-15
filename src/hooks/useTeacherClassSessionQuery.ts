import { Lesson } from "@/app/teacher/page";
import { fetcher } from "@/lib/fetcher";
import { queryOptions } from "@tanstack/react-query";

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function createTeacherClassSessionsQueryOptions(
  userId: string
) {
  return queryOptions({
    queryKey: ["teacher-schedule-class-sessions", userId],
    queryFn: (): Promise<{ data: Lesson[]; pagination: Pagination }> =>
      fetcher(`/api/class-session?userId=${userId}`),
  });
}
