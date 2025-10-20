"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import {
  BranchSettings,
  BranchSettingsUpdatePayload,
} from "@/types/branch-settings";
import { AlertCircle, Archive, Save } from "lucide-react";

export function ArchiveSettings() {
  const [retentionMonths, setRetentionMonths] = useState<string>("");

  // Fetch global settings
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["global-archive-settings"],
    queryFn: () => fetcher<{ data: BranchSettings }>("/api/settings/branch"),
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: BranchSettingsUpdatePayload) => {
      return fetcher("/api/settings/branch", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success("グローバルアーカイブ設定が更新されました");
      refetch();
    },
    onError: (error: Error) => {
      toast.error("設定の更新に失敗しました: " + error.message);
    },
  });

  // Trigger archive mutation
  const triggerArchiveMutation = useMutation({
    mutationFn: async () => {
      return fetcher("/api/archives/trigger", {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    onSuccess: (response: any) => {
      const { archivedCount, deletedCount } = response.data;
      toast.success(
        `アーカイブが完了しました: ${archivedCount}件をアーカイブ、${deletedCount}件を削除しました`
      );
    },
    onError: (error: Error) => {
      toast.error("アーカイブの実行に失敗しました: " + error.message);
    },
  });

  // Set initial value when data is loaded
  useEffect(() => {
    if (data?.data) {
      setRetentionMonths(data.data.archiveRetentionMonths.toString());
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const months = parseInt(retentionMonths);
    if (isNaN(months) || months < 1 || months > 120) {
      toast.error("保存期間は1〜120ヶ月の間で設定してください");
      return;
    }
    updateMutation.mutate({ archiveRetentionMonths: months });
  };

  const handleReset = () => {
    if (data?.data) {
      setRetentionMonths(data.data.archiveRetentionMonths.toString());
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>設定の読み込みに失敗しました</AlertDescription>
      </Alert>
    );
  }

  const currentSettings = data?.data;
  const isModified =
    currentSettings &&
    retentionMonths !== currentSettings.archiveRetentionMonths.toString();

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="retention-months">
            グローバルアーカイブ保存期間（月数）
          </Label>
          <div className="flex gap-2 items-center">
            <Input
              id="retention-months"
              type="number"
              min="1"
              max="120"
              value={retentionMonths}
              onChange={(e) => setRetentionMonths(e.target.value)}
              className="w-32"
              placeholder="6"
            />
            <span className="text-sm text-muted-foreground">ヶ月</span>
          </div>
          <p className="text-sm text-muted-foreground">
            この期間を過ぎた授業セッションは全ての校舎で自動的にアーカイブされます
          </p>
          {currentSettings?.isDefault && (
            <p className="text-sm text-blue-600">
              現在はデフォルト設定を使用しています
            </p>
          )}
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              この設定は全ての校舎に適用されます
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={!isModified || updateMutation.isPending}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            保存
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!isModified}
            size="sm"
          >
            リセット
          </Button>
        </div>
      </form>

      <div className="pt-4 border-t">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">手動アーカイブ</h4>
          <p className="text-sm text-muted-foreground">
            グローバル保存期間に基づいて、全ての校舎の古いセッションをアーカイブします
          </p>
          <Button
            variant="outline"
            onClick={() => triggerArchiveMutation.mutate()}
            disabled={triggerArchiveMutation.isPending}
            size="sm"
          >
            <Archive className="h-4 w-4 mr-2" />
            {triggerArchiveMutation.isPending
              ? "実行中..."
              : "アーカイブを実行"}
          </Button>
        </div>
      </div>
    </div>
  );
}
