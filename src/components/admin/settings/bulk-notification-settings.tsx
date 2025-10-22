"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, AlertTriangle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BulkNotificationSettingsProps {
  onBulkUpdate: (
    userType: "students" | "teachers" | "all",
    enabled: boolean
  ) => Promise<void>;
  isUpdating: boolean;
}

export function BulkNotificationSettings({
  onBulkUpdate,
  isUpdating,
}: BulkNotificationSettingsProps) {
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean;
    userType: "students" | "teachers" | "all";
    enabled: boolean;
    title: string;
    description: string;
  }>({
    open: false,
    userType: "students",
    enabled: false,
    title: "",
    description: "",
  });

  const handleBulkUpdateClick = (
    userType: "students" | "teachers" | "all",
    enabled: boolean
  ) => {
    const userTypeLabels = {
      students: "生徒",
      teachers: "講師",
      all: "全ユーザー",
    };

    const actionLabel = enabled ? "有効化" : "無効化";
    const userLabel = userTypeLabels[userType];

    setConfirmationDialog({
      open: true,
      userType,
      enabled,
      title: `${userLabel}の通知を${actionLabel}`,
      description: `LINE連携済みの${userLabel}の通知設定を一括で${actionLabel}します。この操作は元に戻すことができません。続行してもよろしいですか？`,
    });
  };

  const handleConfirm = async () => {
    try {
      await onBulkUpdate(
        confirmationDialog.userType,
        confirmationDialog.enabled
      );
      setConfirmationDialog((prev) => ({ ...prev, open: false }));
    } catch (error) {
      console.error("一括通知設定の更新に失敗しました:", error);
      // Keep dialog open to allow retry
      // In a real implementation, you might want to show a toast notification here
    }
  };

  const handleCancel = () => {
    setConfirmationDialog((prev) => ({ ...prev, open: false }));
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            一括通知設定
          </CardTitle>
          <CardDescription>
            LINE連携済みユーザーの通知設定を一括管理
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="bulk-settings">
              <AccordionTrigger className="text-sm font-medium text-orange-600">
                重要な操作 - クリックして展開
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>生徒の通知</Label>
                      <p className="text-sm text-muted-foreground">
                        LINE連携済みの全生徒の通知設定
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkUpdateClick("students", true)}
                        disabled={isUpdating}
                      >
                        <Bell className="h-4 w-4 mr-1" />
                        有効化
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkUpdateClick("students", false)}
                        disabled={isUpdating}
                      >
                        <BellOff className="h-4 w-4 mr-1" />
                        無効化
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>講師の通知</Label>
                      <p className="text-sm text-muted-foreground">
                        LINE連携済みの全講師の通知設定
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkUpdateClick("teachers", true)}
                        disabled={isUpdating}
                      >
                        <Bell className="h-4 w-4 mr-1" />
                        有効化
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkUpdateClick("teachers", false)}
                        disabled={isUpdating}
                      >
                        <BellOff className="h-4 w-4 mr-1" />
                        無効化
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>全ユーザーの通知</Label>
                      <p className="text-sm text-muted-foreground">
                        LINE連携済みの全ユーザーの通知設定
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleBulkUpdateClick("all", true)}
                        disabled={isUpdating}
                      >
                        <Bell className="h-4 w-4 mr-1" />
                        全て有効化
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleBulkUpdateClick("all", false)}
                        disabled={isUpdating}
                      >
                        <BellOff className="h-4 w-4 mr-1" />
                        全て無効化
                      </Button>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Dialog
        open={confirmationDialog.open}
        onOpenChange={(open) => !open && handleCancel()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {confirmationDialog.title}
            </DialogTitle>
            <DialogDescription>
              {confirmationDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isUpdating}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isUpdating}
              variant={confirmationDialog.enabled ? "default" : "destructive"}
            >
              {isUpdating ? "処理中..." : "実行"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
