import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeacherPreferencesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">教師プリファレンス</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>個人情報</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">プロフィール詳細</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>教育設定</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">教育環境の設定</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>テーマとデザイン</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">インターフェース設定</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}