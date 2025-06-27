// src/hooks/useTeacherQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { teacherFilterSchema } from "@/schemas/teacher.schema";

export type Teacher = {
  teacherId: string;
  userId: string;
  name: string;
  kanaName: string | null;
  email: string | null;
  lineId: string | null;
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
    phoneType: string;
    phoneNumber: string;
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
  createdAt: Date;
  updatedAt: Date;
  _optimistic?: boolean;
};

type UseTeachersParams = {
  page?: number;
  limit?: number;
  name?: string;
  status?: string;
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
  const { page = 1, limit = 10, name, status, birthDateFrom, birthDateTo } = params;

  const queryParams: Record<string, string | undefined> = {
    page: page.toString(),
    limit: limit.toString(),
    name,
    status,
    birthDateFrom: birthDateFrom?.toISOString(),
    birthDateTo: birthDateTo?.toISOString(),
  };

  const searchParams = new URLSearchParams(
    Object.entries(queryParams).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<TeachersResponse>({
    queryKey: ["teachers", page, limit, name, status, birthDateFrom, birthDateTo],
    queryFn: async () =>
      await fetcher<TeachersResponse>(`/api/teachers?${searchParams}`),
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
