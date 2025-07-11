// src/hooks/useLineChannelQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import {
  lineChannelFilterSchema,
  type LineChannelSortField,
} from "@/schemas/line-channel.schema";
import { LineChannelResponse, LineChannelListResponse } from "@/types/line-channel";

type UseLineChannelsParams = {
  page?: number;
  limit?: number;
  name?: string;
  isActive?: boolean;
  branchId?: string;
  sortBy?: LineChannelSortField;
  sortOrder?: "asc" | "desc";
};

export function useLineChannels(params: UseLineChannelsParams = {}) {
  const {
    page = 1,
    limit = 10,
    name,
    isActive,
    branchId,
    sortBy = "name",
    sortOrder = "asc",
  } = params;

  const query = lineChannelFilterSchema.parse({
    page,
    limit,
    name,
    isActive,
    branchId,
    sortBy,
    sortOrder,
  });

  const searchParams = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<LineChannelListResponse>({
    queryKey: ["line-channels", page, limit, name, isActive, branchId, sortBy, sortOrder],
    queryFn: async () => {
      const response = await fetcher<LineChannelListResponse>(`/api/admin/line-channels?${searchParams}`);
      // Ensure we always return a valid response structure
      return {
        data: response?.data || [],
        pagination: response?.pagination || {
          total: 0,
          page: 1,
          limit: limit,
          pages: 0
        }
      };
    },
  });
}

// Hook for getting all active LINE channels (useful for dropdowns/selects)
export function useActiveLineChannels() {
  return useQuery<LineChannelResponse[]>({
    queryKey: ["line-channels-active"],
    queryFn: async () => {
      const response = await fetcher<LineChannelListResponse>(
        `/api/admin/line-channels?limit=100&isActive=true&sortBy=name&sortOrder=asc`
      );
      return response.data || [];
    },
  });
}

// Hook for getting LINE channels assigned to a specific branch
export function useBranchLineChannels(branchId: string) {
  return useQuery<LineChannelResponse[]>({
    queryKey: ["branch-line-channels", branchId],
    queryFn: async () => {
      const response = await fetcher<LineChannelListResponse>(
        `/api/admin/line-channels?branchId=${branchId}&limit=100`
      );
      return response.data || [];
    },
    enabled: !!branchId,
  });
}

// Hook for getting a single LINE channel by ID
export function useLineChannel(channelId: string) {
  return useQuery<LineChannelResponse>({
    queryKey: ["line-channel", channelId],
    queryFn: async () =>
      await fetcher<{ data: LineChannelResponse }>(`/api/admin/line-channels/${channelId}`).then(
        (res) => res.data
      ),
    enabled: !!channelId,
  });
}

// Hook for checking if migration from environment variables is available
export function useMigrationStatus() {
  return useQuery<{ canMigrate: boolean; envChannelExists: boolean }>({
    queryKey: ["line-channel-migration-status"],
    queryFn: async () =>
      await fetcher<{ canMigrate: boolean; envChannelExists: boolean }>(
        `/api/admin/line-channels/migration-status`
      ),
  });
}