"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Info, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetcher } from "@/lib/fetcher";
import { MessageTemplateEditor } from "./message-template-editor";
import {
  MessageTemplate,
  getDefaultTemplates,
} from "@/lib/line/message-templates";
import { BulkNotificationSettings } from "./bulk-notification-settings";

interface LineStats {
  totalStudents: number;
  linkedStudents: number;
  notificationsEnabledStudents: number;
  totalTeachers: number;
  linkedTeachers: number;
  notificationsEnabledTeachers: number;
}

export function LineSettings() {
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Utility function to parse error messages
  const parseErrorMessage = (error: unknown): string => {
    if (typeof error === "string") return error;

    const err = error as {
      message?: string;
      info?: {
        details?: unknown[];
        error?: string;
        message?: string;
      };
      status?: number;
    };

    // Handle validation errors
    if (err?.info?.details && Array.isArray(err.info.details)) {
      const validationErrors = err.info.details.map((detail: unknown) => {
        const d = detail as { path?: string[]; message?: string };
        if (d.path && d.path.includes("content")) {
          return "メッセージ内容は必須です。";
        }
        return d.message || "入力内容を確認してください。";
      });
      return validationErrors.join(" ");
    }

    // Handle API errors
    if (err?.info?.error) return err.info.error;
    if (err?.info?.message) return err.info.message;
    if (err?.message) return err.message;

    // Handle network errors
    if (err?.status === 500)
      return "サーバーエラーが発生しました。しばらく待ってからお試しください。";
    if (err?.status === 403) return "この操作を実行する権限がありません。";
    if (err?.status === 401)
      return "認証が必要です。再度ログインしてください。";
    if (err?.status && err.status >= 400)
      return "リクエストの処理に失敗しました。";

    return "予期しないエラーが発生しました。";
  };

  // Enhanced error display component
  const renderErrorState = (
    error: unknown,
    title: string,
    onRetry?: () => void
  ) => (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong>{title}</strong>
          <div className="mt-1 text-sm">{parseErrorMessage(error)}</div>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            再試行
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );

  // Fetch message templates with enhanced error handling
  const {
    data: templatesData,
    isLoading: templatesLoading,
    error: templatesError,
    refetch: refetchTemplates,
  } = useQuery({
    queryKey: ["line-templates"],
    queryFn: () => fetcher("/api/settings/line/templates"),
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors, but not for 4xx errors
      if (failureCount < 3) {
        const err = error as { status?: number };
        return !err.status || err.status >= 500;
      }
      return false;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Fetch LINE statistics with enhanced error handling
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["line-stats"],
    queryFn: () => fetcher("/api/settings/line/stats"),
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors, but not for 4xx errors
      if (failureCount < 3) {
        const err = error as { status?: number };
        return !err.status || err.status >= 500;
      }
      return false;
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  });

  const isLoading = templatesLoading || statsLoading;

  // Mutation for bulk updating notification settings with enhanced error handling
  const updateNotificationSettings = useMutation({
    mutationFn: async ({
      userType,
      enabled,
    }: {
      userType: "students" | "teachers" | "all";
      enabled: boolean;
    }) => {
      return fetcher("/api/settings/line/notifications", {
        method: "PUT",
        body: JSON.stringify({ userType, enabled }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["line-stats"] });
      toast({
        title: "設定を更新しました",
        description: "通知設定が正常に更新されました。",
      });
    },
    onError: (error) => {
      console.error("Failed to update notification settings:", error);
      toast({
        title: "設定更新エラー",
        description: parseErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const handleBulkUpdate = async (
    userType: "students" | "teachers" | "all",
    enabled: boolean
  ) => {
    setIsUpdating(true);
    try {
      await updateNotificationSettings.mutateAsync({ userType, enabled });
    } finally {
      setIsUpdating(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show error state if both queries failed
  if (templatesError && statsError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>データの読み込みに失敗しました</strong>
            <div className="mt-2 text-sm">
              メッセージテンプレートと統計情報の読み込みに失敗しました。
              ネットワーク接続とサーバーの状態を確認してください。
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchTemplates();
                  refetchStats();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                再読み込み
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const lineStats = (stats as { data: LineStats })?.data || {
    totalStudents: 0,
    linkedStudents: 0,
    notificationsEnabledStudents: 0,
    totalTeachers: 0,
    linkedTeachers: 0,
    notificationsEnabledTeachers: 0,
  };

  return (
    <div className="space-y-6">
      {/* Message Templates */}
      <Card>
        <CardHeader>
          <CardTitle>メッセージテンプレート</CardTitle>
          <CardDescription>
            LINE通知で使用するメッセージテンプレートを管理
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templatesError ? (
            renderErrorState(
              templatesError,
              "テンプレートの読み込みに失敗しました",
              refetchTemplates
            )
          ) : (
            <MessageTemplateEditor
              templates={
                (templatesData as { data: MessageTemplate[] })?.data ||
                getDefaultTemplates()
              }
              onSave={async (templates) => {
                try {
                  await fetcher("/api/settings/line/templates", {
                    method: "POST",
                    body: JSON.stringify({ templates }),
                  });

                  queryClient.invalidateQueries({
                    queryKey: ["line-templates"],
                  });

                  toast({
                    title: "テンプレートを保存しました",
                    description:
                      "メッセージテンプレートが正常に更新されました。",
                  });
                } catch (error) {
                  console.error("Failed to save LINE templates:", error);
                  toast({
                    title: "テンプレート保存エラー",
                    description: parseErrorMessage(error),
                    variant: "destructive",
                  });
                }
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      {statsError ? (
        renderErrorState(
          statsError,
          "統計情報の読み込みに失敗しました",
          refetchStats
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">生徒のLINE連携状況</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    総生徒数
                  </span>
                  <span className="font-medium">{lineStats.totalStudents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    LINE連携済み
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {lineStats.linkedStudents}
                    </span>
                    <Badge variant="secondary">
                      {lineStats.totalStudents > 0
                        ? `${Math.round((lineStats.linkedStudents / lineStats.totalStudents) * 100)}%`
                        : "0%"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    通知有効
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {lineStats.notificationsEnabledStudents}
                    </span>
                    <Badge variant="default">
                      {lineStats.linkedStudents > 0
                        ? `${Math.round((lineStats.notificationsEnabledStudents / lineStats.linkedStudents) * 100)}%`
                        : "0%"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">講師のLINE連携状況</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    総講師数
                  </span>
                  <span className="font-medium">{lineStats.totalTeachers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    LINE連携済み
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {lineStats.linkedTeachers}
                    </span>
                    <Badge variant="secondary">
                      {lineStats.totalTeachers > 0
                        ? `${Math.round((lineStats.linkedTeachers / lineStats.totalTeachers) * 100)}%`
                        : "0%"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    通知有効
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {lineStats.notificationsEnabledTeachers}
                    </span>
                    <Badge variant="default">
                      {lineStats.linkedTeachers > 0
                        ? `${Math.round((lineStats.notificationsEnabledTeachers / lineStats.linkedTeachers) * 100)}%`
                        : "0%"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notification Info */}
      <Card>
        <CardHeader>
          <CardTitle>通知スケジュール</CardTitle>
          <CardDescription>LINEメッセージの自動送信タイミング</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              毎日、設定した時刻にその日の全授業をまとめた通知が送信されます。
              通知は5分ごとにチェックされ、設定時刻から10分以内に送信されます。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      <BulkNotificationSettings
        onBulkUpdate={handleBulkUpdate}
        isUpdating={isUpdating}
      />
    </div>
  );
}
