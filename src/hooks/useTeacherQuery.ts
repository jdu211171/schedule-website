// src/hooks/useTeacherQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";

export type Teacher = {
  teacherId: string;
  userId: string;
  name: string;
  kanaName: string | null;
  email: string | null;
  lineId: string | null;
  lineUserId: string | null;
  lineNotificationsEnabled: boolean | null;
  notes: string | null;
  status?: string;
  birthDate: string | null;
  phoneNumber: string | null;
  phoneNotes: string | null;
  username: string | null;
  password: string | null;
  contactPhones?: {
    id: string;
    phoneNumber: string;
    notes: string | null;
    order: number;
  }[];
  // Contact emails (non-login informational emails)
  contactEmails?: {
    id: string;
    email: string;
    notes: string | null;
    order: number;
  }[];
  branches: {
    branchId: string;
    name: string;
  }[];
  subjectPreferences: {
    subjectId: string;
    subjectTypeIds: string[];
  }[];
  regularAvailability: {
    dayOfWeek: string;
    timeSlots: {
      id: string;
      startTime: string;
      endTime: string;
    }[];
    fullDay: boolean;
  }[];
  exceptionalAvailability: {
    date: string;
    timeSlots: {
      id: string;
      startTime: string;
      endTime: string;
    }[];
    fullDay: boolean;
    reason?: string | null;
    notes?: string | null;
  }[];
  absenceAvailability: {
    date: string;
    timeSlots: {
      id: string;
      startTime: string;
      endTime: string;
    }[];
    fullDay: boolean;
    reason?: string | null;
    notes?: string | null;
  }[];
  createdAt: Date;
  updatedAt: Date;
  _optimistic?: boolean;
};

type UseTeachersParams = {
  page?: number;
  limit?: number;
  name?: string;
  status?: string;
  statuses?: string[]; // Support multiple statuses
  birthDateFrom?: Date;
  birthDateTo?: Date;
};

type TeachersResponse = {
  data: Teacher[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

export function useTeachers(params: UseTeachersParams = {}) {
  const { page = 1, limit = 10, name, status, statuses, birthDateFrom, birthDateTo } = params;

  // Build search params manually to handle arrays
  const searchParams = new URLSearchParams();
  searchParams.append("page", page.toString());
  searchParams.append("limit", limit.toString());
  if (name) searchParams.append("name", name);
  if (status) searchParams.append("status", status);
  if (statuses && statuses.length > 0) {
    statuses.forEach((s) => searchParams.append("statuses", s));
  }
  if (birthDateFrom) searchParams.append("birthDateFrom", birthDateFrom.toISOString());
  if (birthDateTo) searchParams.append("birthDateTo", birthDateTo.toISOString());

  return useQuery<TeachersResponse>({
    queryKey: ["teachers", page, limit, name, status, statuses, birthDateFrom, birthDateTo],
    queryFn: async () =>
      await fetcher<TeachersResponse>(`/api/teachers?${searchParams.toString()}`),
  });
}

export function useTeacher(teacherId: string) {
  return useQuery<Teacher>({
    queryKey: ["teacher", teacherId],
    queryFn: async () =>
      await fetcher<{ data: Teacher[] }>(`/api/teachers/${teacherId}`).then(
        (res) => res.data[0]
      ),
    enabled: !!teacherId,
  });
}
