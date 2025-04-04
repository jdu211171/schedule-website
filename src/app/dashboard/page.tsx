import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>個人スケジュール</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">スケジュールの概要がここに表示されます</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>設定</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">システム設定へのアクセス</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ユーザー設定</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">ユーザープロファイルの設定</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}