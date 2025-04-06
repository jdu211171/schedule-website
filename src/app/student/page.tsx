import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">学生ダッシュボード</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>個人スケジュール</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">学生のスケジュール概要</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>課題</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">現在の課題リスト</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>成績</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">成績の概要</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}