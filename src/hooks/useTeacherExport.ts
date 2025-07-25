// src/hooks/useTeacherExport.ts
import { useState } from "react";
import { fetcherWithAuth } from "@/lib/fetcher";
import { toast } from "sonner";

interface ExportOptions {
  name?: string;
  status?: string[];
  branch?: string[];
  subject?: string[];
  lineConnection?: string[];
  birthDateRange?: { from?: Date; to?: Date };
  columns: string[];
}

export function useTeacherExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = async (options: ExportOptions) => {
    try {
      setIsExporting(true);

      // Build query params
      const params = new URLSearchParams();
      if (options.name) params.append("name", options.name);
      if (options.status && options.status.length > 0) {
        params.append("status", options.status.join(","));
      }
      if (options.branch && options.branch.length > 0) {
        params.append("branch", options.branch.join(","));
      }
      if (options.subject && options.subject.length > 0) {
        params.append("subject", options.subject.join(","));
      }
      if (options.lineConnection && options.lineConnection.length > 0) {
        params.append("lineConnection", options.lineConnection.join(","));
      }
      if (options.birthDateRange) {
        if (options.birthDateRange.from) {
          params.append("birthDateFrom", options.birthDateRange.from.toISOString());
        }
        if (options.birthDateRange.to) {
          params.append("birthDateTo", options.birthDateRange.to.toISOString());
        }
      }
      if (options.columns.length > 0) {
        params.append("columns", options.columns.join(","));
      }

      const response = await fetcherWithAuth(`/api/teachers/export?${params.toString()}`);

      // Check if response is ok
      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `teachers_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("講師データをエクスポートしました");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("エクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToCSV, isExporting };
}
