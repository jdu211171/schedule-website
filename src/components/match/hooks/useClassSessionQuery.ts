// useClassSessionQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { ClassSession, ClassSessionQuery, ClassSessionQuerySchema } from "@/schemas/class-session.schema";

type UseClassSessionsParams = ClassSessionQuery;

type ClassSessionsResponse = {
  data: ClassSession[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleClassSessionResponse = {
  data: ClassSession;
};

export function useClassSessions(params: UseClassSessionsParams = {
  page: 1,
  limit: 10,
  sort: "date",
  order: "asc"
}) {
  const query = ClassSessionQuerySchema.parse(params);
  const searchParams = new URLSearchParams(
      Object.entries(query).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => acc.append(key, String(v)));
          } else {
            acc.append(key, String(value));
          }
        }
        return acc;
      }, new URLSearchParams())
  ).toString();

  return useQuery<ClassSessionsResponse>({
    queryKey: ["class-sessions", params],
    queryFn: async () => await fetcher<ClassSessionsResponse>(`/api/class-session?${searchParams}`),
  });
}

export function useClassSession(classSessionId: string) {
  return useQuery<ClassSession>({
    queryKey: ["class-session", classSessionId],
    queryFn: async () => await fetcher<SingleClassSessionResponse>(`/api/class-session/${classSessionId}`).then((res) => res.data),
    enabled: !!classSessionId,
  });
}
