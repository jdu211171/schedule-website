// src/hooks/useStaffQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";

export type Staff = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: string;
  branches: {
    branchId: string;
    name: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

type UseStaffsParams = {
  page?: number;
  limit?: number;
  name?: string;
};

type StaffsResponse = {
  data: Staff[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleStaffResponse = {
  data: Staff[];
};

export function useStaffs(params: UseStaffsParams = {}) {
  const { page = 1, limit = 10, name } = params;

  // Create query params
  const searchParams = new URLSearchParams();
  if (page) searchParams.append("page", page.toString());
  if (limit) searchParams.append("limit", limit.toString());
  if (name) searchParams.append("name", name);

  return useQuery<StaffsResponse>({
    queryKey: ["staffs", page, limit, name],
    queryFn: async () =>
      await fetcher<StaffsResponse>(`/api/staffs?${searchParams.toString()}`),
  });
}

export function useStaff(staffId: string) {
  return useQuery<Staff>({
    queryKey: ["staff", staffId],
    queryFn: async () =>
      await fetcher<SingleStaffResponse>(`/api/staffs/${staffId}`).then(
        (res) => res.data[0]
      ),
    enabled: !!staffId,
  });
}
