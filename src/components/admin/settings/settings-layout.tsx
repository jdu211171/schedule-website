"use client";

import Link from "next/link";
import { LineSettings } from "./line-settings";
import { ArchiveSettings } from "./archive-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, Archive } from "lucide-react";

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            LINEチャンネル管理
          </CardTitle>
          <CardDescription>
            LINE通知を送信するためのチャンネルを管理します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            複数のLINEチャンネルを設定し、ブランチごとに異なるチャンネルを使用できます。
          </p>
          <Link href="/dashboard/settings/line-channels" passHref>
            <Button variant="outline" className="w-full sm:w-auto">
              チャンネル管理へ
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            アーカイブ設定
          </CardTitle>
          <CardDescription>
            授業セッションのアーカイブ保存期間を設定します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ArchiveSettings />
        </CardContent>
      </Card>
    </div>
  );
}