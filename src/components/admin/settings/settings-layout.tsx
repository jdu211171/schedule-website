"use client";

import { LineSettings } from "./line-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsLayout() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">設定</h1>
        <p className="text-muted-foreground">
          アプリケーション設定と構成を管理
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>LINE設定</CardTitle>
          <CardDescription>
            LINEメッセージングと通知設定を構成
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LineSettings />
        </CardContent>
      </Card>
    </div>
  );
}