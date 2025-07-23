"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Send, CheckCircle, XCircle } from "lucide-react";

export default function NotificationTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingInfo, setPendingInfo] = useState<any>(null);
  const [processResult, setProcessResult] = useState<any>(null);
  const { toast } = useToast();

  const checkPendingNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications/process", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();
      setPendingInfo(data);
      
      toast({
        title: "✅ 取得成功",
        description: `${data.pendingCount}件の保留中の通知が見つかりました`,
      });
    } catch (error) {
      console.error("Error checking pending notifications:", error);
      toast({
        title: "❌ エラー",
        description: error instanceof Error ? error.message : "保留中の通知の確認に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processNotifications = async () => {
    setIsLoading(true);
    setProcessResult(null);
    
    try {
      const response = await fetch("/api/notifications/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchSize: 10,
          maxConcurrency: 3,
          maxExecutionTimeMs: 60000, // 1 minute
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to process: ${response.statusText}`);
      }

      const data = await response.json();
      setProcessResult(data);
      
      toast({
        title: "✅ 処理完了",
        description: `${data.summary.successful}件の通知が送信されました`,
      });

      // Refresh pending count
      await checkPendingNotifications();
    } catch (error) {
      console.error("Error processing notifications:", error);
      toast({
        title: "❌ エラー",
        description: error instanceof Error ? error.message : "通知の処理に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">通知テスト & デバッグ</h1>
        <p className="text-muted-foreground mt-2">
          LINE通知システムの動作確認とトラブルシューティング
        </p>
      </div>

      {/* Pending Notifications Check */}
      <Card>
        <CardHeader>
          <CardTitle>保留中の通知を確認</CardTitle>
          <CardDescription>
            データベースに保留中の通知があるかチェックします
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={checkPendingNotifications} 
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <RefreshCw className="mr-2 h-4 w-4" />
            保留中の通知を確認
          </Button>

          {pendingInfo && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>保留中の通知: </strong>
                  <Badge variant={pendingInfo.pendingCount > 0 ? "destructive" : "default"}>
                    {pendingInfo.pendingCount}件
                  </Badge>
                </AlertDescription>
              </Alert>

              {pendingInfo.pendingSample && pendingInfo.pendingSample.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">サンプル（最初の5件）:</h4>
                  {pendingInfo.pendingSample.map((notification: any) => (
                    <div key={notification.notificationId} className="border rounded p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="outline" className="mr-2">
                            {notification.recipientType}
                          </Badge>
                          <span className="font-mono text-xs">{notification.recipientId}</span>
                        </div>
                        <Badge 
                          variant={notification.status === "FAILED" ? "destructive" : "secondary"}
                        >
                          {notification.status}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <div>種類: {notification.notificationType}</div>
                        <div>試行回数: {notification.processingAttempts}</div>
                        <div>予定時刻: {new Date(notification.scheduledAt).toLocaleString('ja-JP')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process Notifications */}
      {pendingInfo && pendingInfo.pendingCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>通知を手動で処理</CardTitle>
            <CardDescription>
              保留中の通知を手動で処理してLINEメッセージを送信します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                この操作により、保留中の通知が処理され、実際にLINEメッセージが送信されます。
              </AlertDescription>
            </Alert>

            <Button 
              onClick={processNotifications} 
              disabled={isLoading}
              variant="default"
              className="w-full sm:w-auto"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              通知を処理して送信
            </Button>

            {processResult && (
              <div className="mt-4 space-y-4">
                <Alert>
                  <AlertDescription>
                    <h4 className="font-semibold mb-2">処理結果:</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        成功: {processResult.summary.successful}件
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        失敗: {processResult.summary.failed}件
                      </div>
                      <div>処理時間: {processResult.summary.executionTimeMs}ms</div>
                      <div>バッチ数: {processResult.summary.batches}</div>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diagnostic Information */}
      <Card>
        <CardHeader>
          <CardTitle>診断情報</CardTitle>
          <CardDescription>
            通知システムの設定と状態
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Cron スケジュール:</strong>
              <ul className="ml-4 mt-1 list-disc">
                <li>通知作成: 毎時0分</li>
                <li>通知送信: 5分ごと</li>
              </ul>
            </div>
            <div className="mt-4">
              <strong>トラブルシューティング:</strong>
              <ul className="ml-4 mt-1 list-disc space-y-1">
                <li>保留中の通知が0件の場合: 通知作成cronが動作していない可能性があります</li>
                <li>保留中の通知があるが送信されない場合: 通知送信cronまたは認証に問題があります</li>
                <li>処理が失敗する場合: LINE設定またはユーザーのLINE IDを確認してください</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}