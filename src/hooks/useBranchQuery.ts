// src/hooks/useBranchQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { branchFilterSchema } from "@/schemas/branch.schema";

export type Branch = {
  branchId: string;
  name: string;
  notes: string | null;
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

type SingleBranchResponse = {
  data: Branch[];
};

export function useBranches(params: UseBranchesParams = {}) {
  const { page = 1, limit = 10, name } = params;

  const query = branchFilterSchema.parse({
    page,
    limit,
    name,
  });

  const searchParams = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<BranchesResponse>({
    queryKey: ["branches", page, limit, name],
    queryFn: async () =>
      await fetcher<BranchesResponse>(`/api/branches?${searchParams}`),
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
