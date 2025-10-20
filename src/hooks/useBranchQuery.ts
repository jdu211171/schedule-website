// src/hooks/useBranchQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import {
  branchFilterSchema,
  type BranchSortField,
} from "@/schemas/branch.schema";

export type Branch = {
  branchId: string;
  name: string;
  notes: string | null;
  order: number | null;
  lineChannels?: {
    channelId: string;
    name: string;
    description: string | null;
    isActive: boolean;
    isDefault: boolean;
    isPrimary: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

type UseBranchesParams = {
  page?: number;
  limit?: number;
  name?: string;
  sortBy?: BranchSortField;
  sortOrder?: "asc" | "desc";
};

type BranchesResponse = {
  data: Branch[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleBranchResponse = {
  data: Branch[];
};

export function useBranches(params: UseBranchesParams = {}) {
  const {
    page = 1,
    limit = 10,
    name,
    sortBy = "order",
    sortOrder = "asc",
  } = params;

  const query = branchFilterSchema.parse({
    page,
    limit,
    name,
    sortBy,
    sortOrder,
  });

  const searchParams = new URLSearchParams(
    Object.entries(query).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      },
      {} as Record<string, string>
    )
  ).toString();

  return useQuery<BranchesResponse>({
    queryKey: ["branches", page, limit, name, sortBy, sortOrder],
    queryFn: async () =>
      await fetcher<BranchesResponse>(`/api/branches?${searchParams}`),
  });
}

// New hook for getting all branches in order (useful for dropdowns/selects)
export function useAllBranchesOrdered() {
  return useQuery<Branch[]>({
    queryKey: ["branches-all-ordered"],
    queryFn: async () => {
      const response = await fetcher<BranchesResponse>(
        `/api/branches?limit=100&sortBy=order&sortOrder=asc`
      );
      return response.data;
    },
  });
}

// Secure hook for getting the authenticated user's accessible branches
export function useUserBranches() {
  return useQuery<Branch[]>({
    queryKey: ["user-branches"],
    queryFn: async () => {
      const response = await fetcher<{ data: Branch[]; total: number }>(
        `/api/users/me/branches`
      );
      return response.data;
    },
  });
}

export function useBranch(branchId: string) {
  return useQuery<Branch>({
    queryKey: ["branch", branchId],
    queryFn: async () =>
      await fetcher<SingleBranchResponse>(`/api/branches/${branchId}`).then(
        (res) => res.data[0]
      ),
    enabled: !!branchId,
  });
}
