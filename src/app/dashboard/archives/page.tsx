import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ArchiveTable } from "@/components/archives/archive-table";
import { ArchiveStats } from "@/components/archives/archive-stats";
import { ArchiveTrigger } from "@/components/archives/archive-trigger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive, BarChart3, Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "アーカイブ管理 | 講師スケジュール管理",
  description: "過去の授業記録のアーカイブを管理",
};

export default async function ArchivesPage() {
  const session = await auth();
  if (session?.user?.role === "STAFF") {
    redirect("/dashboard/schedules");
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">アーカイブ管理</h1>
        <p className="text-muted-foreground mt-2">
          過去の授業記録を安全に保管・検索できます
        </p>
      </div>

      <Tabs defaultValue="archives" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="archives" className="gap-2">
              <Archive className="h-4 w-4" />
              アーカイブ
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              統計
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              設定
            </TabsTrigger>
          </TabsList>

          <TabsContent value="archives" className="space-y-6">
            <ArchiveTable />
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <ArchiveStats />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <ArchiveTrigger />
              
              <div className="space-y-6">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">自動アーカイブ設定</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">スケジュール</p>
                        <p className="text-sm text-muted-foreground">
                          毎日午前0時（UTC）に実行
                        </p>
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        有効
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">対象期間</p>
                        <p className="text-sm text-muted-foreground">
                          過去の授業記録
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">アーカイブ情報</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      アーカイブされた記録は、講師や生徒が削除されても保持されます。
                    </p>
                    <p>
                      グループクラスの参加生徒情報もJSON形式で保存されます。
                    </p>
                    <p>
                      アーカイブ処理は自動的にエラーハンドリングされ、失敗時はロールバックされます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
      </Tabs>
    </div>
  );
}
