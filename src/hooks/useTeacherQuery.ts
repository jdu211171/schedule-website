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
  statuses?: string[]; // Support multiple statuses
  birthDateFrom?: Date;
  birthDateTo?: Date;
  phoneNumber?: string;
  branchIds?: string[]; // Support multiple branches
  subjectIds?: string[]; // Support multiple subjects
  lineConnection?: string[]; // Support multiple LINE connection states
  sortBy?: string; // Column to sort by
  sortOrder?: "asc" | "desc"; // Sort direction
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
  const { 
    page = 1, 
    limit = 10, 
    name, 
    status, 
    statuses,
    birthDateFrom, 
    birthDateTo, 
    phoneNumber,
    branchIds,
    subjectIds,
    lineConnection,
    sortBy,
    sortOrder
  } = params;

  const queryParams: Record<string, string | string[] | undefined> = {
    page: page.toString(),
    limit: limit.toString(),
    name,
    status,
    statuses,
    birthDateFrom: birthDateFrom?.toISOString(),
    birthDateTo: birthDateTo?.toISOString(),
    phoneNumber,
    branchIds,
    subjectIds,
    lineConnection,
    sortBy,
    sortOrder,
  };

  // Filter out undefined values and empty arrays
  const filteredParams: Record<string, string | string[]> = {};
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && (!Array.isArray(value) || value.length > 0)) {
      filteredParams[key] = value;
    }
  });

  // Build search params manually to handle arrays
  const searchParams = new URLSearchParams();
  Object.entries(filteredParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      // For arrays, add multiple parameters with the same key
      value.forEach(v => searchParams.append(key, v));
    } else {
      searchParams.append(key, value);
    }
  });

  // Debug logging
  console.log("[useTeachers] Query params:", filteredParams);
  console.log("[useTeachers] Search params:", searchParams.toString());

  return useQuery<TeachersResponse>({
    queryKey: ["teachers", filteredParams], // Use filteredParams instead of params to avoid undefined values
    queryFn: async () => {
      console.log("[useTeachers] Fetching teachers with URL:", `/api/teachers?${searchParams.toString()}`);
      return await fetcher<TeachersResponse>(`/api/teachers?${searchParams.toString()}`);
    },
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
