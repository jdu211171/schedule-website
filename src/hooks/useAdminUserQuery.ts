import { useQuery } from "@tanstack/react-query";
import { AdminUserFilter } from "@/schemas/adminUser.schema";
import { fetcher } from "@/lib/fetcher";

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  order: number | null;
  isRestrictedAdmin: boolean;
  branches: {
    branchId: string;
    name: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface AdminUsersResponse {
  data: AdminUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export function useAdminUsers(filters?: AdminUserFilter) {
  const searchParams = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
  }

  const queryString = searchParams.toString();
  const url = `/api/admin-users${queryString ? `?${queryString}` : ""}`;

  return useQuery<AdminUsersResponse>({
    queryKey: ["adminUsers", filters],
    queryFn: () => fetcher(url),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAdminUser(id: string) {
  return useQuery<{ data: AdminUser }>({
    queryKey: ["adminUser", id],
    queryFn: () => fetcher(`/api/admin-users/${id}`),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
