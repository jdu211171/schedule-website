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
  lineNotificationsEnabled?: boolean | null;
  username: string;
  onNotificationToggle?: (enabled: boolean) => void;
}

interface LineLinkingData {
  userId: string;
  name: string;
  username: string;
  isLinked: boolean;
  lineNotificationsEnabled?: boolean;
}

export function LineLinking({
  userId,
  userType,
  userName,
  lineId: initialLineId,
  lineNotificationsEnabled: initialNotificationsEnabled,
  username,
  onNotificationToggle
}: LineLinkingProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [localNotificationsEnabled, setLocalNotificationsEnabled] = useState(initialNotificationsEnabled ?? true);
  const { toast } = useToast();

  // Update local state when prop changes
  useEffect(() => {
    setLocalNotificationsEnabled(initialNotificationsEnabled ?? true);
  }, [initialNotificationsEnabled]);

  const queryKey = [`${userType}-linking`, userId];

  // Use initial data if provided
  const { data: linkingData } = useQuery<LineLinkingData>({
    queryKey,
    queryFn: async () => ({
      userId,
      name: userName,
      username,
      isLinked: !!initialLineId,
      lineNotificationsEnabled: localNotificationsEnabled
    }),
    initialData: {
      userId,
      name: userName,
      username,
      isLinked: !!initialLineId,
      lineNotificationsEnabled: localNotificationsEnabled
    },
    staleTime: 0
  });

  const copyToClipboard = async () => {
    if (!linkingData?.username) return;

    try {
      await navigator.clipboard.writeText(linkingData.username);
      setIsCopied(true);
      toast({
        title: "コピーしました",
        description: "ユーザー名をクリップボードにコピーしました。",
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

  const isLinked = linkingData?.isLinked || false;
  const notificationsEnabled = localNotificationsEnabled;

  const toggleNotifications = () => {
    const newValue = !localNotificationsEnabled;
    setLocalNotificationsEnabled(newValue);
    onNotificationToggle?.(newValue);
  };

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
          <Badge variant={isLinked ? "default" : "secondary"}>
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
      </CardHeader>
      <CardContent className="space-y-4">
        {isLinked ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                メッセージアカウントが連携されています。授業の24時間前と30分前に通知が送信されます。
              </AlertDescription>
            </Alert>

            {onNotificationToggle && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {notificationsEnabled ? (
                    <Bell className="h-4 w-4 text-blue-600" />
                  ) : (
                    <BellOff className="h-4 w-4 text-gray-400" />
                  )}
                  <div>
                    <Label htmlFor="notifications-toggle" className="text-sm font-medium">
                      メッセージ通知
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {notificationsEnabled ? "通知が有効です" : "通知が無効です"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="notifications-toggle"
                  checked={notificationsEnabled}
                  onCheckedChange={toggleNotifications}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                以下のユーザー名をメッセージ公式アカウント (@992emavw) に送信してください。
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={linkingData?.username || ""}
                    readOnly
                    className="w-full px-4 py-2 pr-20 text-lg font-mono text-center bg-gray-50 border rounded-md"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={copyToClipboard}
                  >
                    {isCopied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <h4 className="text-sm font-medium mb-2">連携手順:</h4>
          <ol className="text-sm text-muted-foreground space-y-1">
            <li>1. メッセージ公式アカウント (@992emavw) を友だち追加</li>
            <li>2. トーク画面であなたのユーザー名を送信</li>
            <li>3. 連携完了のメッセージが届きます</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
