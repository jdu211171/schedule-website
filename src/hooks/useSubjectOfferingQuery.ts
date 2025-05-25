// src/hooks/useSubjectOfferingQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { subjectOfferingFilterSchema } from "@/schemas/subject-offering.schema";

export type SubjectOffering = {
  subjectOfferingId: string;
  subjectId: string;
  subjectName: string;
  subjectTypeId: string;
  subjectTypeName: string;
  offeringCode: string | null;
  isActive: boolean;
  notes: string | null;
  branchId: string | null;
  branchName: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    teacherQualifications: number;
    studentSubjectPreferences: number;
  };
  _optimistic?: boolean;
};

type UseSubjectOfferingsParams = {
  page?: number;
  limit?: number;
  subjectId?: string;
  subjectTypeId?: string;
  isActive?: boolean;
  branchId?: string;
  search?: string;
};

type SubjectOfferingsResponse = {
  data: SubjectOffering[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleSubjectOfferingResponse = {
  data: SubjectOffering;
};

/**
 * Hook to fetch a list of subject offerings with pagination and filtering.
 */
export function useSubjectOfferings(params: UseSubjectOfferingsParams = {}) {
  const {
    page = 1,
    limit = 10,
    subjectId,
    subjectTypeId,
    isActive,
    branchId,
    search,
  } = params;

  // Validate and structure parameters using the Zod schema
  const validatedQuery = subjectOfferingFilterSchema.parse({
    page,
    limit,
    subjectId,
    subjectTypeId,
    isActive,
    branchId,
    search,
  });

  // Construct search parameters for the API request
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(validatedQuery)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }
  const queryString = searchParams.toString();

  return useQuery<SubjectOfferingsResponse>({
    queryKey: ["subjectOfferings", validatedQuery],
    queryFn: async () =>
      await fetcher<SubjectOfferingsResponse>(
        `/api/subject-offerings?${queryString}`
      ),
  });
}

/**
 * Hook to fetch a single subject offering by its ID.
 */
export function useSubjectOffering(
  subjectOfferingId: string | undefined | null
) {
  return useQuery<SubjectOffering>({
    queryKey: ["subjectOffering", subjectOfferingId],
    queryFn: async () => {
      if (!subjectOfferingId) {
        throw new Error(
          "subjectOfferingId is required to fetch a single subject offering."
        );
      }
      const response = await fetcher<SingleSubjectOfferingResponse>(
        `/api/subject-offerings/${subjectOfferingId}`
      );
      return response.data;
    },
    enabled: !!subjectOfferingId,
  });
}

/**
 * Hook to fetch all active subject offerings (without pagination) for dropdowns and selects.
 * Useful for forms where you need to show all available subject offerings.
 */
export function useActiveSubjectOfferings(
  params: { branchId?: string; subjectId?: string; subjectTypeId?: string } = {}
) {
  const { branchId, subjectId, subjectTypeId } = params;

  const searchParams = new URLSearchParams({
    limit: "1000",
    isActive: "true",
  });

  if (branchId) searchParams.set("branchId", branchId);
  if (subjectId) searchParams.set("subjectId", subjectId);
  if (subjectTypeId) searchParams.set("subjectTypeId", subjectTypeId);

  const queryString = searchParams.toString();

  return useQuery<SubjectOffering[]>({
    queryKey: [
      "subjectOfferings",
      "active",
      branchId,
      subjectId,
      subjectTypeId,
    ],
    queryFn: async () => {
      const response = await fetcher<SubjectOfferingsResponse>(
        `/api/subject-offerings?${queryString}`
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - subject offerings don't change frequently
  });
}

/**
 * Hook to fetch subject offerings filtered by subject.
 * Useful for showing all available types for a specific subject.
 */
export function useSubjectOfferingsBySubject(
  subjectId: string | undefined | null,
  params: { isActive?: boolean } = {}
) {
  const { isActive = true } = params;

  return useQuery<SubjectOffering[]>({
    queryKey: ["subjectOfferings", "bySubject", subjectId, isActive],
    queryFn: async () => {
      if (!subjectId) {
        return [];
      }
      const searchParams = new URLSearchParams({
        subjectId,
        isActive: isActive.toString(),
        limit: "1000",
      });
      const response = await fetcher<SubjectOfferingsResponse>(
        `/api/subject-offerings?${searchParams.toString()}`
      );
      return response.data;
    },
    enabled: !!subjectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch subject offerings filtered by subject type.
 * Useful for showing all available subjects for a specific type/level.
 */
export function useSubjectOfferingsByType(
  subjectTypeId: string | undefined | null,
  params: { isActive?: boolean; branchId?: string } = {}
) {
  const { isActive = true, branchId } = params;

  return useQuery<SubjectOffering[]>({
    queryKey: ["subjectOfferings", "byType", subjectTypeId, isActive, branchId],
    queryFn: async () => {
      if (!subjectTypeId) {
        return [];
      }
      const searchParams = new URLSearchParams({
        subjectTypeId,
        isActive: isActive.toString(),
        limit: "1000",
      });
      if (branchId) searchParams.set("branchId", branchId);
      const response = await fetcher<SubjectOfferingsResponse>(
        `/api/subject-offerings?${searchParams.toString()}`
      );
      return response.data;
    },
    enabled: !!subjectTypeId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
