// src/hooks/useTeacherQualificationQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { teacherQualificationFilterSchema } from "@/schemas/teacher-qualification.schema";

export type TeacherQualification = {
  qualificationId: string;
  teacherId: string;
  teacherName: string;
  subjectOfferingId: string;
  subjectName: string;
  subjectTypeName: string;
  verified: boolean;
  notes: string | null;
  branchId: string | null;
  branchName: string | null;
  createdAt: string;
  updatedAt: string;
  _optimistic?: boolean;
};

type UseTeacherQualificationsParams = {
  page?: number;
  limit?: number;
  teacherId?: string;
  subjectOfferingId?: string;
  subjectId?: string;
  subjectTypeId?: string;
  verified?: boolean;
  branchId?: string;
};

type TeacherQualificationsResponse = {
  data: TeacherQualification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleTeacherQualificationResponse = {
  data: TeacherQualification;
};

/**
 * Hook to fetch a list of teacher qualifications with pagination and filtering.
 */
export function useTeacherQualifications(
  params: UseTeacherQualificationsParams = {}
) {
  const {
    page = 1,
    limit = 10,
    teacherId,
    subjectOfferingId,
    subjectId,
    subjectTypeId,
    verified,
    branchId,
  } = params;

  // Validate and structure parameters using the Zod schema
  const validatedQuery = teacherQualificationFilterSchema.parse({
    page,
    limit,
    teacherId,
    subjectOfferingId,
    subjectId,
    subjectTypeId,
    verified,
    branchId,
  });

  // Construct search parameters for the API request
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(validatedQuery)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }
  const queryString = searchParams.toString();

  return useQuery<TeacherQualificationsResponse>({
    queryKey: ["teacherQualifications", validatedQuery],
    queryFn: async () =>
      await fetcher<TeacherQualificationsResponse>(
        `/api/teacher-qualifications?${queryString}`
      ),
  });
}

/**
 * Hook to fetch a single teacher qualification by its ID.
 */
export function useTeacherQualification(
  qualificationId: string | undefined | null
) {
  return useQuery<TeacherQualification>({
    queryKey: ["teacherQualification", qualificationId],
    queryFn: async () => {
      if (!qualificationId) {
        throw new Error(
          "qualificationId is required to fetch a single teacher qualification."
        );
      }
      const response = await fetcher<SingleTeacherQualificationResponse>(
        `/api/teacher-qualifications/${qualificationId}`
      );
      return response.data;
    },
    enabled: !!qualificationId,
  });
}

/**
 * Hook to fetch teacher qualifications for a specific teacher.
 * Useful for displaying a teacher's qualifications.
 */
export function useTeacherQualificationsByTeacher(
  teacherId: string | undefined | null,
  params: { verified?: boolean } = {}
) {
  const { verified } = params;

  return useQuery<TeacherQualification[]>({
    queryKey: ["teacherQualifications", "byTeacher", teacherId, verified],
    queryFn: async () => {
      if (!teacherId) {
        return [];
      }
      const searchParams = new URLSearchParams({
        teacherId,
        limit: "1000",
      });
      if (verified !== undefined)
        searchParams.set("verified", verified.toString());

      const response = await fetcher<TeacherQualificationsResponse>(
        `/api/teacher-qualifications?${searchParams.toString()}`
      );
      return response.data;
    },
    enabled: !!teacherId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch teacher qualifications for a specific subject offering.
 * Useful for finding all qualified teachers for a particular subject-type combination.
 */
export function useTeacherQualificationsByOffering(
  subjectOfferingId: string | undefined | null,
  params: { verified?: boolean } = {}
) {
  const { verified = true } = params;

  return useQuery<TeacherQualification[]>({
    queryKey: [
      "teacherQualifications",
      "byOffering",
      subjectOfferingId,
      verified,
    ],
    queryFn: async () => {
      if (!subjectOfferingId) {
        return [];
      }
      const searchParams = new URLSearchParams({
        subjectOfferingId,
        verified: verified.toString(),
        limit: "1000",
      });

      const response = await fetcher<TeacherQualificationsResponse>(
        `/api/teacher-qualifications?${searchParams.toString()}`
      );
      return response.data;
    },
    enabled: !!subjectOfferingId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch teacher qualifications filtered by subject.
 * Useful for finding all teachers qualified for any level of a specific subject.
 */
export function useTeacherQualificationsBySubject(
  subjectId: string | undefined | null,
  params: { verified?: boolean; subjectTypeId?: string } = {}
) {
  const { verified = true, subjectTypeId } = params;

  return useQuery<TeacherQualification[]>({
    queryKey: [
      "teacherQualifications",
      "bySubject",
      subjectId,
      verified,
      subjectTypeId,
    ],
    queryFn: async () => {
      if (!subjectId) {
        return [];
      }
      const searchParams = new URLSearchParams({
        subjectId,
        verified: verified.toString(),
        limit: "1000",
      });
      if (subjectTypeId) searchParams.set("subjectTypeId", subjectTypeId);

      const response = await fetcher<TeacherQualificationsResponse>(
        `/api/teacher-qualifications?${searchParams.toString()}`
      );
      return response.data;
    },
    enabled: !!subjectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch unverified teacher qualifications.
 * Useful for admin/staff to review and verify qualifications.
 */
export function useUnverifiedTeacherQualifications(
  params: { branchId?: string } = {}
) {
  const { branchId } = params;

  return useQuery<TeacherQualification[]>({
    queryKey: ["teacherQualifications", "unverified", branchId],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        verified: "false",
        limit: "1000",
      });
      if (branchId) searchParams.set("branchId", branchId);

      const response = await fetcher<TeacherQualificationsResponse>(
        `/api/teacher-qualifications?${searchParams.toString()}`
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - more frequent updates for pending verifications
  });
}
