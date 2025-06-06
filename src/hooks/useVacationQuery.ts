// src/hooks/useVacationQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import {
  vacationFilterSchema,
  type VacationSortField,
} from "@/schemas/vacation.schema";

type Vacation = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isRecurring: boolean;
  notes: string | null;
  order: number | null;
  branchId: string | null;
  branchName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type UseVacationsParams = {
  page?: number;
  limit?: number;
  name?: string;
  startDate?: Date;
  endDate?: Date;
  isRecurring?: boolean;
  branchId?: string;
  sortBy?: VacationSortField;
  sortOrder?: "asc" | "desc";
};

type VacationsResponse = {
  data: Vacation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleVacationResponse = {
  data: Vacation[];
};

export function useVacations(params: UseVacationsParams = {}) {
  const {
    page = 1,
    limit = 10,
    name,
    startDate,
    endDate,
    isRecurring,
    branchId,
    sortBy = "order",
    sortOrder = "asc",
  } = params;

  const query = vacationFilterSchema.parse({
    page,
    limit,
    name,
    startDate,
    endDate,
    isRecurring,
    branchId,
    sortBy,
    sortOrder,
  });

  const searchParams = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        // Handle Date objects
        if (value instanceof Date) {
          acc[key] = value.toISOString();
        } else {
          acc[key] = String(value);
        }
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<VacationsResponse>({
    queryKey: [
      "vacations",
      page,
      limit,
      name,
      startDate,
      endDate,
      isRecurring,
      branchId,
      sortBy,
      sortOrder,
    ],
    queryFn: async () =>
      await fetcher<VacationsResponse>(`/api/vacations?${searchParams}`),
  });
}

// New hook for getting all vacations in order (useful for dropdowns/selects)
export function useAllVacationsOrdered() {
  return useQuery<Vacation[]>({
    queryKey: ["vacations-all-ordered"],
    queryFn: async () => {
      const response = await fetcher<VacationsResponse>(
        `/api/vacations?limit=100&sortBy=order&sortOrder=asc`
      );
      return response.data;
    },
  });
}

export function useVacation(vacationId: string) {
  return useQuery<Vacation>({
    queryKey: ["vacation", vacationId],
    queryFn: async () =>
      await fetcher<SingleVacationResponse>(
        `/api/vacations/${vacationId}`
      ).then((res) => res.data[0]),
    enabled: !!vacationId,
  });
}
