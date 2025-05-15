import { Lesson } from "@/app/student/page";
import { fetcher } from "@/lib/fetcher";
import { queryOptions } from "@tanstack/react-query";
export default function createUserClassSessionsQueryOptions(
  userId: string
) {
  return queryOptions({
    queryKey: ["user-schedule-class-sessions", userId],
    queryFn: (): Promise<{ data: Lesson[]; pagination: any }> =>
      fetcher(`/api/class-session?userId=${userId}`),
    enabled: !!userId, // Ensures the query only runs when userId is a non-empty string
  });
}
