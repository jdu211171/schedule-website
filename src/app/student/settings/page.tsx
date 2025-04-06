import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">学生設定</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>アカウント設定</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">アカウント情報の管理</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>通知設定</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">通知の環境設定</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>セキュリティ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">パスワードと認証</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}