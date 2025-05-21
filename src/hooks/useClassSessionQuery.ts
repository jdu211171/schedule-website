// src/hooks/useClassSessionQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { classSessionFilterSchema } from "@/schemas/class-session.schema";

export type ClassSession = {
  classId: string;
  seriesId: string | null;
  teacherId: string | null;
  teacherName: string | null;
  studentId: string | null;
  studentName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  classTypeId: string | null;
  classTypeName: string | null;
  boothId: string | null;
  boothName: string | null;
  branchId: string | null;
  branchName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  duration: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _optimistic?: boolean;
};

type UseClassSessionsParams = {
  page?: number;
  limit?: number;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  classTypeId?: string;
  boothId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  seriesId?: string;
};

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

type ClassSessionSeriesResponse = {
  data: ClassSession[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// Hook to fetch a list of class sessions with filters
export function useClassSessions(params: UseClassSessionsParams = {}) {
  const {
    page = 1,
    limit = 10,
    teacherId,
    studentId,
    subjectId,
    classTypeId,
    boothId,
    branchId,
    startDate,
    endDate,
    seriesId,
  } = params;

  const queryParams: Record<string, string | undefined> = {
    page: page.toString(),
    limit: limit.toString(),
    teacherId,
    studentId,
    subjectId,
    classTypeId,
    boothId,
    branchId,
    startDate,
    endDate,
    seriesId,
  };

  const searchParams = new URLSearchParams(
    Object.entries(queryParams).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<ClassSessionsResponse>({
    queryKey: [
      "classSessions",
      page,
      limit,
      teacherId,
      studentId,
      subjectId,
      classTypeId,
      boothId,
      branchId,
      startDate,
      endDate,
      seriesId,
    ],
    queryFn: async () =>
      await fetcher<ClassSessionsResponse>(
        `/api/class-sessions?${searchParams}`
      ),
  });
}

// Hook to fetch a single class session by ID
export function useClassSession(classId: string) {
  return useQuery<ClassSession>({
    queryKey: ["classSession", classId],
    queryFn: async () =>
      await fetcher<SingleClassSessionResponse>(
        `/api/class-sessions/${classId}`
      ).then((res) => res.data),
    enabled: !!classId,
  });
}

// Hook to fetch all sessions in a series
export function useClassSessionSeries(seriesId: string) {
  return useQuery<ClassSession[]>({
    queryKey: ["classSessionSeries", seriesId],
    queryFn: async () =>
      await fetcher<ClassSessionSeriesResponse>(
        `/api/class-sessions/series/${seriesId}`
      ).then((res) => res.data),
    enabled: !!seriesId,
  });
}
