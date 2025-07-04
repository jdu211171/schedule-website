"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetcher } from "@/lib/fetcher";
import { MessageTemplateEditor } from "./message-template-editor";
import { MessageTemplate, getDefaultTemplates } from "@/lib/line/message-templates";
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

  // Fetch message templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery<{ data: MessageTemplate[] }>({
    queryKey: ["line-templates"],
    queryFn: () => fetcher("/api/settings/line/templates"),
  });

  // Fetch LINE statistics
  const { data: stats, isLoading } = useQuery<{ data: LineStats }>({
    queryKey: ["line-stats"],
    queryFn: () => fetcher("/api/settings/line/stats"),
  });

  // Mutation for bulk updating notification settings
  const updateNotificationSettings = useMutation({
    mutationFn: async ({ userType, enabled }: { userType: "students" | "teachers" | "all"; enabled: boolean }) => {
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
    onError: () => {
      toast({
        title: "エラー",
        description: "設定の更新に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const handleBulkUpdate = async (userType: "students" | "teachers" | "all", enabled: boolean) => {
    setIsUpdating(true);
    try {
      await updateNotificationSettings.mutateAsync({ userType, enabled });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading || templatesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const lineStats = stats?.data || {
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
          <MessageTemplateEditor
            templates={templatesData?.data || getDefaultTemplates()}
            onSave={async (templates) => {
              try {
                await fetcher("/api/settings/line/templates", {
                  method: "POST",
                  body: JSON.stringify({ templates }),
                });

                queryClient.invalidateQueries({ queryKey: ["line-templates"] });

                toast({
                  title: "テンプレートを保存しました",
                  description: "メッセージテンプレートが正常に更新されました。",
                });
              } catch (error) {
                // Extract error details from CustomError
                let errorMessage = "テンプレートの保存に失敗しました。";
                
                const err = error as { info?: { details?: unknown[]; error?: string } };
                if (err?.info?.details && Array.isArray(err.info.details)) {
                  // Handle validation errors
                  const validationErrors = err.info.details.map((detail: unknown) => {
                    const d = detail as { path?: string[]; message?: string };
                    if (d.path && d.path.includes('content')) {
                      return "メッセージ内容は必須です。";
                    }
                    return d.message || "入力内容を確認してください。";
                  });
                  errorMessage = validationErrors.join(" ");
                } else if (err?.info?.error) {
                  errorMessage = err.info.error;
                }
                
                toast({
                  title: "エラー",
                  description: errorMessage,
                  variant: "destructive",
                });
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">生徒のLINE連携状況</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">総生徒数</span>
                <span className="font-medium">{lineStats.totalStudents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">LINE連携済み</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{lineStats.linkedStudents}</span>
                  <Badge variant="secondary">
                    {lineStats.totalStudents > 0
                      ? `${Math.round((lineStats.linkedStudents / lineStats.totalStudents) * 100)}%`
                      : "0%"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">通知有効</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{lineStats.notificationsEnabledStudents}</span>
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
                <span className="text-sm text-muted-foreground">総講師数</span>
                <span className="font-medium">{lineStats.totalTeachers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">LINE連携済み</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{lineStats.linkedTeachers}</span>
                  <Badge variant="secondary">
                    {lineStats.totalTeachers > 0
                      ? `${Math.round((lineStats.linkedTeachers / lineStats.totalTeachers) * 100)}%`
                      : "0%"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">通知有効</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{lineStats.notificationsEnabledTeachers}</span>
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
