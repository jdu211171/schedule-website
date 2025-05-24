import { fetcher } from "@/lib/fetcher";
import { ClassSessionFilter, classSessionFilterSchema } from "@/schemas/class-session.schema";
import { Prisma } from "@prisma/client";
import { useQuery, useQueries, UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
import { addDays, format, startOfWeek } from "date-fns";

export const classSessionWithRelationsInclude = {
  booth: true,
  classType: true,
  subject: true,
  teacher: true,
  student: true,
  branch: true,
} as const;

export type ClassSessionWithRelations = Prisma.ClassSessionGetPayload<{
  include: typeof classSessionWithRelationsInclude;
}>;

export interface ApiClassSessionFields {
  teacherName?: string;
  studentName?: string;
  subjectName?: string;
  classTypeName?: string;
  boothName?: string;
  branchName?: string | null;
  seriesId?: string | null;
  duration?: number;
}

export type ExtendedClassSessionWithRelations = ClassSessionWithRelations & ApiClassSessionFields;

export type UseClassSessionsParams = {
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
  date?: string;
};

export type ClassSessionsResponse = {
  data: ExtendedClassSessionWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

export type SingleClassSessionResponse = {
  data: ExtendedClassSessionWithRelations;
};

export type DayFilters = {
  subjectId?: string;
  teacherId?: string;
  studentId?: string;
};

export function useClassSessions(params: UseClassSessionsParams = { page: 1, limit: 10 }) {
  const validatedQuery = classSessionFilterSchema.parse(params);

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(validatedQuery)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)));
      } else {
        searchParams.set(key, String(value));
      }
    }
  }
  const queryString = searchParams.toString();

  return useQuery<ClassSessionsResponse>({
    queryKey: ["classSessions", validatedQuery],
    queryFn: async () =>
      await fetcher<ClassSessionsResponse>(`/api/class-sessions?${queryString}`),
  });
}

export function useClassSession(classSessionId: string | undefined | null) {
  return useQuery<ExtendedClassSessionWithRelations>({
    queryKey: ["classSession", classSessionId],
    queryFn: async () => {
      if (!classSessionId) {
        throw new Error("classSessionId is required to fetch a single class session.");
      }
      const response = await fetcher<SingleClassSessionResponse>(`/api/class-sessions/${classSessionId}`);
      return response.data;
    },
    enabled: !!classSessionId,
  });
}

export function useMultipleDaysClassSessions(
  dates: string[], 
  filters: Record<string, DayFilters> = {}
): UseQueryResult<ClassSessionsResponse, Error>[] {
  return useQueries({
    queries: dates.map(dateStr => ({
      queryKey: ['classSessions', 'byDate', dateStr, filters[dateStr]],
      queryFn: async () => {
        const params = new URLSearchParams({
          date: dateStr,
        });
        
        const dateFilters = filters[dateStr];
        if (dateFilters?.subjectId) {
          params.append('subjectId', dateFilters.subjectId);
        }
        if (dateFilters?.teacherId) {
          params.append('teacherId', dateFilters.teacherId);
        }
        if (dateFilters?.studentId) {
          params.append('studentId', dateFilters.studentId);
        }
        
        const url = `/api/class-sessions?${params.toString()}`;
        return await fetcher<ClassSessionsResponse>(url);
      },
      staleTime: 1000 * 60 * 5, 
    }))
  });
}

export function useClassSessionsDateRange(params: {
  startDate: string;
  endDate: string;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  page?: number;
  limit?: number;
}) {
  const { startDate, endDate, teacherId, studentId, subjectId, page = 1, limit = 50 } = params;

  return useQuery<ClassSessionsResponse>({
    queryKey: ["classSessions", "dateRange", startDate, endDate, teacherId, studentId, subjectId, page, limit],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        page: page.toString(),
        limit: limit.toString(),
      });

      if (teacherId) queryParams.append("teacherId", teacherId);
      if (studentId) queryParams.append("studentId", studentId);
      if (subjectId) queryParams.append("subjectId", subjectId);

      return await fetcher<ClassSessionsResponse>(`/api/class-sessions?${queryParams.toString()}`);
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useClassSessionsByDate(date: string, params: {
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  limit?: number;
} = {}) {
  const { teacherId, studentId, subjectId, limit } = params;

  return useQuery<ClassSessionsResponse>({
    queryKey: ["classSessions", "byDate", date, teacherId, studentId, subjectId],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        startDate: date,
        endDate: date,
        page: "1",
      });

      if (limit !== undefined) {
        queryParams.append("limit", limit.toString());
      }
      if (teacherId) queryParams.append("teacherId", teacherId);
      if (studentId) queryParams.append("studentId", studentId);
      if (subjectId) queryParams.append("subjectId", subjectId);

      return await fetcher<ClassSessionsResponse>(`/api/class-sessions?${queryParams.toString()}`);
    },
    enabled: !!date,
  });
}

export function useMultipleWeeksClassSessions(selectedWeeks: Date[]) {
  const weekQueries = useQueries({
    queries: selectedWeeks.map(week => {
      const weekStart = startOfWeek(week, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');
      
      return {
        queryKey: ['classSessions', 'dateRange', startDate, endDate],
        queryFn: async () => {
          const params = new URLSearchParams({
            startDate,
            endDate,
            limit: '100'
          });
          
          const url = `/api/class-sessions?${params.toString()}`;
          return await fetcher<ClassSessionsResponse>(url);
        },
        staleTime: 1000 * 60 * 5,
      };
    })
  });

  const allSessions = useMemo(() => {
    const sessions: ExtendedClassSessionWithRelations[] = [];
    
    weekQueries.forEach((query) => {
      if (query.data?.data && Array.isArray(query.data.data)) {
        sessions.push(...query.data.data);
      }
    });
    
    return sessions;
  }, [weekQueries]);

  const isLoading = useMemo(() => {
    return weekQueries.some((query) => query.isLoading || query.isFetching);
  }, [weekQueries]);

  return {
    weekQueries,
    allSessions,
    isLoading
  };
}
