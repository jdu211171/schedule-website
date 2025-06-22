// src/hooks/useGenericExport.ts
import { useState } from "react";
import { fetcherWithAuth } from "@/lib/fetcher";
import { toast } from "sonner";

interface ExportOptions {
  columns: string[];
}

export function useGenericExport(endpoint: string, entityName: string) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = async (options: ExportOptions) => {
    try {
      setIsExporting(true);
      
      // Build query params
      const params = new URLSearchParams();
      if (options.columns.length > 0) {
        params.append("columns", options.columns.join(","));
      }

      const response = await fetcherWithAuth(`${endpoint}?${params.toString()}`);
      
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
      link.download = `${entityName}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${entityName}データをエクスポートしました`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("エクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToCSV, isExporting };
}