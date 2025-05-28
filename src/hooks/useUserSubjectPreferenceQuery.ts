// src/hooks/useUserSubjectPreferenceQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { userSubjectPreferenceFilterSchema } from "@/schemas/user-subject-preference.schema";

export type UserSubjectPreference = {
  id: string;
  userId: string;
  userName: string | null;
  username: string | null;
  subjectId: string;
  subjectName: string;
  subjectTypeId: string;
  subjectTypeName: string;
  createdAt: Date;
};

type UseUserSubjectPreferencesParams = {
  page?: number;
  limit?: number;
  userId?: string;
  subjectId?: string;
  subjectTypeId?: string;
};

type UserSubjectPreferencesResponse = {
  data: UserSubjectPreference[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleUserSubjectPreferenceResponse = {
  data: UserSubjectPreference[];
};

export function useUserSubjectPreferences(
  params: UseUserSubjectPreferencesParams = {}
) {
  const { page = 1, limit = 10, userId, subjectId, subjectTypeId } = params;

  const query = userSubjectPreferenceFilterSchema.parse({
    page,
    limit,
    userId,
    subjectId,
    subjectTypeId,
  });

  const searchParams = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<UserSubjectPreferencesResponse>({
    queryKey: [
      "userSubjectPreferences",
      page,
      limit,
      userId,
      subjectId,
      subjectTypeId,
    ],
    queryFn: async () =>
      await fetcher<UserSubjectPreferencesResponse>(
        `/api/user-subject-preferences?${searchParams}`
      ),
  });
}

export function useUserSubjectPreference(id: string) {
  return useQuery<UserSubjectPreference>({
    queryKey: ["userSubjectPreference", id],
    queryFn: async () =>
      await fetcher<SingleUserSubjectPreferenceResponse>(
        `/api/user-subject-preferences/${id}`
      ).then((res) => res.data[0]),
    enabled: !!id,
  });
}

/**
 * Hook to fetch user subject preferences for a specific user.
 * Useful for getting all preferences for a particular user.
 */
export function useUserSubjectPreferencesByUser(userId: string) {
  return useQuery<UserSubjectPreference[]>({
    queryKey: ["userSubjectPreferences", "byUser", userId],
    queryFn: async () => {
      const response = await fetcher<UserSubjectPreferencesResponse>(
        `/api/user-subject-preferences?userId=${userId}&limit=1000`
      );
      return response.data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch user subject preferences for a specific subject.
 * Useful for seeing which users have preferences for a particular subject.
 */
export function useUserSubjectPreferencesBySubject(subjectId: string) {
  return useQuery<UserSubjectPreference[]>({
    queryKey: ["userSubjectPreferences", "bySubject", subjectId],
    queryFn: async () => {
      const response = await fetcher<UserSubjectPreferencesResponse>(
        `/api/user-subject-preferences?subjectId=${subjectId}&limit=1000`
      );
      return response.data;
    },
    enabled: !!subjectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch user subject preferences for a specific subject type.
 * Useful for seeing which users have preferences for a particular subject type.
 */
export function useUserSubjectPreferencesBySubjectType(subjectTypeId: string) {
  return useQuery<UserSubjectPreference[]>({
    queryKey: ["userSubjectPreferences", "bySubjectType", subjectTypeId],
    queryFn: async () => {
      const response = await fetcher<UserSubjectPreferencesResponse>(
        `/api/user-subject-preferences?subjectTypeId=${subjectTypeId}&limit=1000`
      );
      return response.data;
    },
    enabled: !!subjectTypeId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
