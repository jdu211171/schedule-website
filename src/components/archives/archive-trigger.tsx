"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useArchiveTrigger } from "@/hooks/useArchiveQuery";
import { Archive, AlertTriangle, Loader2 } from "lucide-react";

export function ArchiveTrigger() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { mutate: triggerArchive, isPending } = useArchiveTrigger();

  const handleTrigger = () => {
    triggerArchive();
    setShowConfirmDialog(false);
  };

  return (
    <>
      <Card className="border-warning">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            手動アーカイブ実行
          </CardTitle>
          <CardDescription>
            過去の授業記録を手動でアーカイブします
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <h4 className="text-sm font-medium mb-2">実行内容:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 過去の授業記録を検索</li>
                <li>• 講師・生徒・科目名などの情報を保存</li>
                <li>• グループクラスの参加生徒情報を保存</li>
                <li>• 元の授業記録を削除</li>
              </ul>
            </div>

            <div className="rounded-lg bg-warning/10 border border-warning/20 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">注意事項</p>
                  <p className="text-sm text-muted-foreground">
                    この操作は取り消せません。アーカイブされた記録は元の形式には戻せません。
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isPending}
              className="w-full"
              variant="outline"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  アーカイブ実行中...
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  アーカイブを実行
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アーカイブの実行確認</AlertDialogTitle>
            <AlertDialogDescription>
              過去の授業記録をアーカイブして削除します。
              この操作は取り消せません。本当に実行しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleTrigger}>
              実行する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}