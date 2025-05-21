import { fetcher } from "@/lib/fetcher";
import { ClassSessionFilter, classSessionFilterSchema } from "@/schemas/class-session.schema";
import { Prisma } from "@prisma/client";
import { useQuery, useQueries, UseQueryResult } from "@tanstack/react-query";

// Define the include object for ClassSession relations
export const classSessionWithRelationsInclude = {
  booth: true,
  classType: true,
  subject: true,
  teacher: true,
  student: true,
  branch: true,
} as const;

// Type for a ClassSession with all its relations from Prisma
export type ClassSessionWithRelations = Prisma.ClassSessionGetPayload<{
  include: typeof classSessionWithRelationsInclude;
}>;

// Дополнительные поля из API, которые не включены в Prisma тип
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

// Расширенный тип, который объединяет Prisma-тип и поля API
export type ExtendedClassSessionWithRelations = ClassSessionWithRelations & ApiClassSessionFields;

// Parameters for the useClassSessions hook
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
};

// Response type for a list of class sessions - используем расширенный тип
export type ClassSessionsResponse = {
  data: ExtendedClassSessionWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// Response type for a single class session - используем расширенный тип
export type SingleClassSessionResponse = {
  data: ExtendedClassSessionWithRelations;
};

/**
 * Hook to fetch a list of class sessions with pagination and filtering.
 */
export function useClassSessions(params: UseClassSessionsParams = { page: 1, limit: 10 }) {
  // Validate and structure parameters using the Zod schema
  const validatedQuery = classSessionFilterSchema.parse(params);

  // Construct search parameters for the API request
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

/**
 * Hook to fetch a single class session by its ID.
 */
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

/**
 * Hook for simultaneously fetching class sessions data for multiple individual dates
 */
export function useMultipleDaysClassSessions(dates: string[]): UseQueryResult<ClassSessionsResponse, Error>[] {
  return useQueries({
    queries: dates.map(dateStr => ({
      queryKey: ['classSessions', 'byDate', dateStr],
      queryFn: async () => {
        const url = `/api/class-sessions?date=${dateStr}&limit=100`;
        return await fetcher<ClassSessionsResponse>(url);
      },
      staleTime: 1000 * 60 * 5, 
    }))
  });
}