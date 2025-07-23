"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Send, CheckCircle, XCircle, Zap, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function NotificationTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingInfo, setPendingInfo] = useState<any>(null);
  const [processResult, setProcessResult] = useState<any>(null);
  const [completeFlowResult, setCompleteFlowResult] = useState<any>(null);
  const [skipTimeCheck, setSkipTimeCheck] = useState(true);
  const [flowStep, setFlowStep] = useState<string>("");
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

  const runCompleteNotificationFlow = async () => {
    setIsLoading(true);
    setCompleteFlowResult(null);
    setFlowStep("");
    
    const results: any = {
      createResult: null,
      sendResult: null,
      errors: []
    };
    
    try {

      // Step 1: Create notifications (queue them)
      setFlowStep("テンプレートを取得して通知を作成中...");
      console.log("Step 1: Creating notifications...");
      
      const createResponse = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skipTimeCheck,
        }),
      });

      console.log("Create response status:", createResponse.status);

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || `通知作成エラー: ${createResponse.statusText}`);
      }

      const createData = await createResponse.json();
      results.createResult = createData;
      console.log("Notifications created:", createData);
      
      toast({
        title: "✅ 通知作成完了",
        description: `${createData.notificationsQueued}件の通知が作成されました`,
      });

      // Wait a moment before processing
      console.log("Waiting before processing...");
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Process notifications (send them)
      setFlowStep("作成された通知をLINEで送信中...");
      console.log("Step 2: Processing notifications...");
      
      const processResponse = await fetch("/api/notifications/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchSize: 20,
          maxConcurrency: 5,
          maxExecutionTimeMs: 120000, // 2 minutes
        }),
      });

      console.log("Process response status:", processResponse.status);

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        console.error("Process error:", errorData);
        results.errors.push(`送信エラー: ${errorData.error || processResponse.statusText}`);
        
        // Also show the error in toast
        toast({
          title: "❌ 送信エラー",
          description: errorData.error || processResponse.statusText,
          variant: "destructive",
        });
      } else {
        const processData = await processResponse.json();
        results.sendResult = processData;
        console.log("Notifications processed:", processData);
        
        toast({
          title: "✅ 送信完了",
          description: `${processData.summary.successful}件のLINEメッセージが送信されました`,
        });
      }

      setCompleteFlowResult(results);
      setFlowStep("");
      
      // Refresh pending count
      await checkPendingNotifications();
      
    } catch (error) {
      console.error("Error in complete notification flow:", error);
      
      // Enhanced error display
      const errorMessage = error instanceof Error ? error.message : "完全な通知フローに失敗しました";
      const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error);
      
      setCompleteFlowResult({
        createResult: results.createResult,
        sendResult: null,
        errors: [`フローエラー: ${errorMessage}`, `詳細: ${errorDetails}`]
      });
      
      toast({
        title: "❌ エラー",
        description: errorMessage,
        variant: "destructive",
      });
      setFlowStep("");
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

      {/* Complete Notification Flow Test */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            完全な通知フローテスト
          </CardTitle>
          <CardDescription>
            テンプレート取得から LINE 送信まで、通知の全プロセスを手動で実行します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>このテストについて</AlertTitle>
            <AlertDescription>
              このボタンは以下のプロセスを実行します：
              <ol className="list-decimal ml-5 mt-2">
                <li>アクティブな LINE テンプレートを取得</li>
                <li>テンプレート設定に基づいて対象日の授業を検索</li>
                <li>該当する受信者（生徒・講師）の通知を作成</li>
                <li>作成された通知を即座に LINE で送信</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-2">
            <Switch
              id="skip-time-check"
              checked={skipTimeCheck}
              onCheckedChange={setSkipTimeCheck}
            />
            <Label htmlFor="skip-time-check">
              時間チェックをスキップ（設定時間外でも通知を作成）
            </Label>
          </div>

          <Button 
            onClick={runCompleteNotificationFlow} 
            disabled={isLoading}
            variant="default"
            size="lg"
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Zap className="mr-2 h-4 w-4" />
            通知フロー全体を実行
          </Button>

          {flowStep && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {flowStep}
            </div>
          )}

          {completeFlowResult && (
            <div className="space-y-4 mt-4">
              <Alert>
                <AlertTitle>フロー実行結果</AlertTitle>
                <AlertDescription>
                  <div className="space-y-3 mt-2">
                    {/* Create Result */}
                    {completeFlowResult.createResult && (
                      <div>
                        <h4 className="font-semibold mb-1">通知作成結果:</h4>
                        <div className="ml-4 space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            作成された通知: {completeFlowResult.createResult.notificationsQueued}件
                          </div>
                          <div>処理されたテンプレート: {completeFlowResult.createResult.templatesProcessed}件</div>
                          {completeFlowResult.createResult.errors && completeFlowResult.createResult.errors.length > 0 && (
                            <div className="text-red-600">
                              エラー: {completeFlowResult.createResult.errors.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Send Result */}
                    {completeFlowResult.sendResult && (
                      <div>
                        <h4 className="font-semibold mb-1">LINE送信結果:</h4>
                        <div className="ml-4 space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            成功: {completeFlowResult.sendResult.summary.successful}件
                          </div>
                          {completeFlowResult.sendResult.summary.failed > 0 && (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              失敗: {completeFlowResult.sendResult.summary.failed}件
                            </div>
                          )}
                          <div>処理時間: {completeFlowResult.sendResult.summary.executionTimeMs}ms</div>
                        </div>
                      </div>
                    )}

                    {/* Errors */}
                    {completeFlowResult.errors && completeFlowResult.errors.length > 0 && (
                      <div className="text-red-600">
                        <h4 className="font-semibold mb-1">エラー:</h4>
                        <ul className="ml-4 list-disc">
                          {completeFlowResult.errors.map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

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