import { fetcher } from "@/lib/fetcher";
import { ClassSessionQuerySchema } from "@/schemas/class-session.schema";
import { Prisma } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";

// Define the include object for ClassSession relations
// Based on: /home/user/Development/schedule-website/src/app/api/class-session/[classSessionId]/route.ts
export const classSessionWithRelationsInclude = {
  booth: true,
  classType: true,
  subject: {
    include: {
      subjectToSubjectTypes: {
        include: {
          subjectType: true,
        },
      },
    },
  },
  subjectType: true, // Direct relation from ClassSession to SubjectType
  teacher: true,
  student: true,
  regularClassTemplate: true,
  studentClassEnrollments: {
    include: {
      student: true,
    },
  },
} as const;

// Type for a ClassSession with all its relations
export type ClassSessionWithRelations = Prisma.ClassSessionGetPayload<{
  include: typeof classSessionWithRelationsInclude;
}>;

// Parameters for the useClassSessions hook
export type UseClassSessionsParams = {
  page?: number;
  limit?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  subjectTypeId?: string | string[]; // Can be single or multiple
  boothId?: string;
  classTypeId?: string;
  templateId?: string; // Corresponds to regularClassTemplateId
  dayOfWeek?: string; // e.g., "MONDAY", "TUESDAY"
  isTemplateInstance?: boolean;
  sort?: string; // Field to sort by
  order?: "asc" | "desc"; // Sort order
};

// Response type for a list of class sessions
export type ClassSessionsResponse = {
  data: ClassSessionWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// Response type for a single class session
export type SingleClassSessionResponse = {
  data: ClassSessionWithRelations;
};

/**
 * Hook to fetch a list of class sessions with pagination and filtering.
 * Parameters are validated using ClassSessionQuerySchema.
 */
export function useClassSessions(params: UseClassSessionsParams = {}) {
  // Validate and structure parameters using the Zod schema
  const validatedQuery = ClassSessionQuerySchema.parse(params);

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
      await fetcher<ClassSessionsResponse>(`/api/class-session?${queryString}`),
  });
}

/**
 * Hook to fetch a single class session by its ID.
 * Returns the class session with its relations.
 */
export function useClassSession(classSessionId: string | undefined | null) {
  return useQuery<ClassSessionWithRelations>({
    queryKey: ["classSession", classSessionId],
    queryFn: async () => {
      if (!classSessionId) {
        throw new Error("classSessionId is required to fetch a single class session.");
      }
      const response = await fetcher<SingleClassSessionResponse>(`/api/class-session/${classSessionId}`);
      return response.data;
    },
    enabled: !!classSessionId,
  });
}
