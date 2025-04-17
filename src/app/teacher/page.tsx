import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeacherPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">教師ダッシュボード</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

        <Link href="/teacher/schedule">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>スケジュール</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">授業スケジュールを見る</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}