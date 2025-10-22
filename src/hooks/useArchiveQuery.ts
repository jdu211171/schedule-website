import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";

export interface Archive {
  archiveId: string;
  classId: string;
  teacherName: string | null;
  studentName: string | null;
  subjectName: string | null;
  boothName: string | null;
  branchName: string | null;
  classTypeName: string | null;
  enrolledStudents: any | null;
  date: string;
  startTime: string;
  endTime: string;
  duration: number | null;
  notes: string | null;
  archivedAt: string;
  isGroupClass?: boolean;
  enrolledStudentCount?: number;
}

export interface ArchiveStats {
  totalArchived: number;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
  archivesByMonth: Array<{
    month: string;
    count: number;
  }>;
  archivesByBranch: Array<{
    branchName: string;
    count: number;
  }>;
  estimatedStorageSizeMB: number;
}

interface ArchiveFilters {
  page?: number;
  limit?: number;
  teacherName?: string;
  studentName?: string;
  subjectName?: string;
  branchName?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface AdvancedArchiveFilters extends ArchiveFilters {
  classTypeName?: string;
  enrolledStudentName?: string;
  includeGroupClasses?: boolean;
}

interface ArchivesResponse {
  data: Archive[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Hook for fetching archives with filters
export function useArchiveQuery(filters: ArchiveFilters = {}) {
  const queryParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.append(key, String(value));
    }
  });

  return useQuery<ArchivesResponse>({
    queryKey: ["archives", filters],
    queryFn: () => fetcher(`/api/archives?${queryParams.toString()}`),
  });
}

// Hook for advanced archive search
export function useArchiveSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (filters: AdvancedArchiveFilters) => {
      const response = await fetcher("/api/archives/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filters),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archives"] });
    },
    onError: (error: Error) => {
      toast.error("アーカイブの検索に失敗しました");
      console.error("Archive search error:", error);
    },
  });
}

interface StatsResponse {
  data: ArchiveStats;
}

// Hook for fetching archive statistics
export function useArchiveStats() {
  return useQuery<StatsResponse>({
    queryKey: ["archive-stats"],
    queryFn: () => fetcher("/api/archives/stats"),
  });
}

// Hook for manually triggering archive process
export function useArchiveTrigger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetcher("/api/archives/trigger", {
        method: "POST",
      });
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["archives"] });
      queryClient.invalidateQueries({ queryKey: ["archive-stats"] });

      const result = data?.data;
      if (result) {
        toast.success(
          `${result.message}\n${result.archivedCount}件をアーカイブ、${result.deletedCount}件を削除しました`
        );
      }
    },
    onError: (error: Error) => {
      toast.error("アーカイブ処理の実行に失敗しました");
      console.error("Archive trigger error:", error);
    },
  });
}
