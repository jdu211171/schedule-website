// src/hooks/useStudentExport.ts
import { useState } from "react";
import { fetcherWithAuth } from "@/lib/fetcher";
import { toast } from "sonner";

interface ExportOptions {
  name?: string;
  status?: string[];
  studentType?: string[];
  gradeYear?: string[];
  branch?: string[];
  subject?: string[];
  lineConnection?: string[];
  columns: string[];
}

export function useStudentExport() {
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
      if (options.studentType && options.studentType.length > 0) {
        params.append("studentType", options.studentType.join(","));
      }
      if (options.gradeYear && options.gradeYear.length > 0) {
        params.append("gradeYear", options.gradeYear.join(","));
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
      if (options.columns.length > 0) {
        params.append("columns", options.columns.join(","));
      }

      const response = await fetcherWithAuth(`/api/students/export?${params.toString()}`);

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
      link.download = `students_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("生徒データをエクスポートしました");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("エクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToCSV, isExporting };
}
