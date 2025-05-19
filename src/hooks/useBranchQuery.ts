// src/hooks/useBranchQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";

export type Branch = {
  branchId: string;
  name: string;
  notes: string | null;
  users: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    role: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

type UseBranchesParams = {
  page?: number;
  limit?: number;
  name?: string;
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

export function useBranches(params: UseBranchesParams = {}) {
  const { page = 1, limit = 10, name } = params;

  // Create query params
  const searchParams = new URLSearchParams();
  if (page) searchParams.append("page", page.toString());
  if (limit) searchParams.append("limit", limit.toString());
  if (name) searchParams.append("name", name);

  return useQuery<BranchesResponse>({
    queryKey: ["branches", page, limit, name],
    queryFn: async () =>
      await fetcher<BranchesResponse>(
        `/api/branches?${searchParams.toString()}`
      ),
  });
}
