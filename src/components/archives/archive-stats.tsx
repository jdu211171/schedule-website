"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useArchiveStats } from "@/hooks/useArchiveQuery";
import {
  Archive,
  Calendar,
  Database,
  Building2,
  TrendingUp,
  HardDrive,
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export function ArchiveStats() {
  const { data: stats, isLoading } = useArchiveStats();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "データなし";
    return format(new Date(dateString), "yyyy年MM月dd日", { locale: ja });
  };

  const formatStorageSize = (sizeMB: number) => {
    if (sizeMB < 1) return `${(sizeMB * 1024).toFixed(2)} KB`;
    if (sizeMB < 1024) return `${sizeMB.toFixed(2)} MB`;
    return `${(sizeMB / 1024).toFixed(2)} GB`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const archiveStats = stats?.data;
  if (!archiveStats) return null;

  // Find the month with the most archives
  const peakMonth = archiveStats.archivesByMonth.reduce<{
    month: string;
    count: number;
  }>((max, current) => (current.count > max.count ? current : max), {
    month: "",
    count: 0,
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              総アーカイブ件数
            </CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {archiveStats.totalArchived.toLocaleString()}件
            </div>
            <p className="text-xs text-muted-foreground">
              削除された過去の授業記録
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">データ期間</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <p className="font-medium">
                {formatDate(archiveStats.dateRange.earliest)}
              </p>
              <p className="text-muted-foreground">から</p>
              <p className="font-medium">
                {formatDate(archiveStats.dateRange.latest)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              推定ストレージサイズ
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatStorageSize(archiveStats.estimatedStorageSizeMB)}
            </div>
            <p className="text-xs text-muted-foreground">
              アーカイブデータの概算サイズ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Archives Chart */}
      {archiveStats.archivesByMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              月別アーカイブ件数（過去12ヶ月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {archiveStats.archivesByMonth.map((month) => {
                const percentage =
                  archiveStats.totalArchived > 0
                    ? (month.count / archiveStats.totalArchived) * 100
                    : 0;
                const isPeak = month.month === peakMonth.month;

                return (
                  <div key={month.month} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-20">
                      {month.month}
                    </span>
                    <div className="flex-1">
                      <div className="h-6 bg-muted rounded-md overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isPeak ? "bg-primary" : "bg-primary/70"
                          }`}
                          style={{ width: `${Math.max(percentage * 5, 2)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {month.count}件
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Archives by Branch */}
      {archiveStats.archivesByBranch.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              支店別アーカイブ件数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archiveStats.archivesByBranch.map((branch) => (
                <div
                  key={branch.branchName}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-sm font-medium">
                    {branch.branchName}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {branch.count.toLocaleString()}件
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
