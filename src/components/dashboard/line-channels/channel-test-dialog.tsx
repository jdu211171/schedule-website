"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChannelResponse } from "@/types/line-channel";
import { useLineChannelTestExisting } from "@/hooks/useLineChannelMutation";
import { Badge } from "@/components/ui/badge";

interface ChannelTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: LineChannelResponse | null;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export function ChannelTestDialog({
  open,
  onOpenChange,
  channel,
}: ChannelTestDialogProps) {
  const testMutation = useLineChannelTestExisting();
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    if (!channel) return;

    try {
      const result = await testMutation.mutateAsync({
        channelId: channel.id,
      });

      setTestResult({
        success: result.success,
        message: result.success
          ? "チャンネルは正常に動作しています"
          : "チャンネルのテストに失敗しました",
        details: result.botInfo,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: "テストに失敗しました",
        details: error,
      });
    }
  };

  const handleClose = () => {
    setTestResult(null);
    onOpenChange(false);
  };

  if (!channel) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>チャンネル認証情報テスト</DialogTitle>
          <DialogDescription>
            「{channel.name}」の認証情報をテストします
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">チャンネル名</span>
              <span className="text-sm">{channel.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">ステータス</span>
              <Badge variant={channel.isActive ? "default" : "secondary"}>
                {channel.isActive ? "有効" : "無効"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">アクセストークン</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {channel.channelAccessTokenPreview}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">シークレット</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {channel.channelSecretPreview}
              </code>
            </div>
          </div>

          {!testResult && (
            <Alert>
              <AlertDescription>
                テストボタンをクリックして、LINE APIとの接続を確認します。
                実際のメッセージは送信されません。
              </AlertDescription>
            </Alert>
          )}

          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {testResult.success ? "テスト成功" : "テスト失敗"}
              </AlertTitle>
              <AlertDescription className="mt-2">
                {testResult.message}
                {testResult.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">
                      詳細情報
                    </summary>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(testResult.details, null, 2)}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            閉じる
          </Button>
          <Button onClick={handleTest} disabled={testMutation.isPending}>
            {testMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                テスト中...
              </>
            ) : (
              "テスト実行"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
