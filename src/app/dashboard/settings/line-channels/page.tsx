"use client";

import { Card } from "@/components/ui/card";
import { LineChannelTable } from "@/components/dashboard/line-channels/channel-list";
import { BranchChannelOverview } from "@/components/dashboard/line-channels/branch-channel-overview";

export default function LineChannelsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">LINEチャンネル管理</h1>
        <p className="text-muted-foreground">
          LINE通知を送信するためのチャンネルを管理します。各校舎で講師・生徒向けのチャンネルを設定できます。
        </p>
      </div>
      
      <BranchChannelOverview />
      
      <div>
        <h2 className="text-xl font-semibold mb-4">チャンネル一覧</h2>
        <LineChannelTable />
      </div>
    </div>
  );
}
