"use client";

import { Card } from "@/components/ui/card";
import { LineChannelTable } from "@/components/dashboard/line-channels/channel-list";

export default function LineChannelsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">LINEチャンネル管理</h1>
        <p className="text-muted-foreground">
          LINE通知を送信するためのチャンネルを管理します。
        </p>
      </div>
      <LineChannelTable />
    </div>
  );
}
