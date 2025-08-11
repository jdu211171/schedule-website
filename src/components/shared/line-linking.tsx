"use client";

import { useState, useEffect } from "react";
import {
  Copy,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Link,
  Unlink,
  Bell,
  BellOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface LineLinkingProps {
  userId: string;
  userType: "student" | "teacher";
  userName: string;
  lineId?: string | null;
  parentLineId1?: string | null;
  lineUserId?: string | null;
  lineNotificationsEnabled?: boolean | null;
  username: string;
  onNotificationToggle?: (enabled: boolean) => void;
}

interface LineLinkingData {
  userId: string;
  name: string;
  username: string;
  lineUserId?: string | null;
  isLinked: boolean;
  lineNotificationsEnabled?: boolean;
}

// Component for individual LINE account linking
function LineAccountCard({
  accountType,
  accountName,
  lineId,
  username,
  lineUserId,
  notificationsEnabled,
  onNotificationToggle,
  isMainAccount = false
}: {
  accountType: 'student' | 'parent';
  accountName: string;
  lineId?: string | null;
  username: string;
  lineUserId?: string | null;
  notificationsEnabled?: boolean;
  onNotificationToggle?: (enabled: boolean) => void;
  isMainAccount?: boolean;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    const baseText = lineUserId || username;
    const textToCopy = `> ${baseText}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      toast({
        title: "コピーしました",
        description: `"${textToCopy}" をクリップボードにコピーしました。`,
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "クリップボードへのコピーに失敗しました。",
      });
    }
  };

  const isLinked = !!lineId;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{accountName}</h4>
        <Badge variant={isLinked ? "default" : "secondary"} className="text-xs">
          {isLinked ? (
            <>
              <Link className="h-3 w-3 mr-1" />
              連携済み
            </>
          ) : (
            <>
              <Unlink className="h-3 w-3 mr-1" />
              未連携
            </>
          )}
        </Badge>
      </div>

      {isLinked ? (
        <div className="space-y-3">
          <Alert className="py-2">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              メッセージアカウントが連携されています。
            </AlertDescription>
          </Alert>

          {isMainAccount && onNotificationToggle && (
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <div className="flex items-center gap-2">
                {notificationsEnabled ? (
                  <Bell className="h-4 w-4 text-blue-600" />
                ) : (
                  <BellOff className="h-4 w-4 text-gray-400" />
                )}
                <Label className="text-xs">
                  {notificationsEnabled ? "通知有効" : "通知無効"}
                </Label>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={onNotificationToggle}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            以下のコマンドをメッセージボットに送信してください:
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={`> ${lineUserId || username}`}
                  readOnly
                  className="w-full px-3 py-2 pr-12 text-sm font-mono text-center bg-muted border rounded text-foreground"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={copyToClipboard}
                >
                  {isCopied ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LineLinking({
  userId,
  userType,
  userName,
  lineId: initialLineId,
  parentLineId1,
  lineUserId,
  lineNotificationsEnabled: initialNotificationsEnabled,
  username,
  onNotificationToggle
}: LineLinkingProps) {
  const [localNotificationsEnabled, setLocalNotificationsEnabled] = useState(initialNotificationsEnabled ?? true);

  // Update local state when prop changes
  useEffect(() => {
    setLocalNotificationsEnabled(initialNotificationsEnabled ?? true);
  }, [initialNotificationsEnabled]);

  const toggleNotifications = () => {
    const newValue = !localNotificationsEnabled;
    setLocalNotificationsEnabled(newValue);
    onNotificationToggle?.(newValue);
  };

  // For teachers, show the legacy single account view
  if (userType === 'teacher') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" />
                メッセージ連携
              </CardTitle>
              <CardDescription>
                メッセージアカウントと連携して授業の通知を受け取ります
              </CardDescription>
            </div>
            <Badge variant={initialLineId ? "default" : "secondary"}>
              {initialLineId ? (
                <>
                  <Link className="h-3 w-3 mr-1" />
                  連携済み
                </>
              ) : (
                <>
                  <Unlink className="h-3 w-3 mr-1" />
                  未連携
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <LineAccountCard
            accountType="student"
            accountName="講師アカウント"
            lineId={initialLineId}
            username={username}
            lineUserId={lineUserId}
            notificationsEnabled={localNotificationsEnabled}
            onNotificationToggle={toggleNotifications}
            isMainAccount={true}
          />
        </CardContent>
      </Card>
    );
  }

  // For students, show the new 3-account view
  const hasAnyConnection = !!(initialLineId || parentLineId1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              メッセージ連携
            </CardTitle>
            <CardDescription>
              生徒と保護者（最大2名）のメッセージアカウントを連携できます
            </CardDescription>
          </div>
          <Badge variant={hasAnyConnection ? "default" : "secondary"}>
            {hasAnyConnection ? (
              <>
                <Link className="h-3 w-3 mr-1" />
                {[initialLineId, parentLineId1].filter(Boolean).length}件連携中
              </>
            ) : (
              <>
                <Unlink className="h-3 w-3 mr-1" />
                未連携
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <LineAccountCard
            accountType="student"
            accountName="生徒アカウント"
            lineId={initialLineId}
            username={username}
            lineUserId={lineUserId}
            notificationsEnabled={localNotificationsEnabled}
            onNotificationToggle={toggleNotifications}
            isMainAccount={true}
          />
          
          <LineAccountCard
            accountType="parent"
            accountName="保護者"
            lineId={parentLineId1}
            username={username}
            lineUserId={lineUserId}
          />
        </div>

        <div className="pt-2 border-t">
          <h4 className="text-sm font-medium mb-2">連携手順:</h4>
          <ol className="text-sm text-muted-foreground space-y-1">
            <li>1. メッセージ公式アカウント (@992emavw) を友だち追加</li>
            <li>2. 各アカウントから表示されたコマンドを送信</li>
            <li>3. 連携完了のメッセージが届きます</li>
            <li className="text-xs text-blue-600">※ 同じメッセージに同じ内容が複数届く場合があります</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
