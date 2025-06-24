import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home, Calendar } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="border-0 shadow-2xl bg-card/50 backdrop-blur-sm">
          <CardContent className="p-12 text-center space-y-8">
            {/* Large 404 Text */}
            <div className="space-y-4">
              <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                404
              </h1>
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                  ページが見つかりません
                </h2>
                <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
                  おっと！お探しのページが見つからないようです。
                  予想とは異なるスケジュールにあるかもしれません。
                </p>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Action Buttons */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/" className="flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    ホームに戻る
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    ダッシュボード
                  </Link>
                </Button>
              </div>
            </div>

            {/* Helpful Links */}
            <div className="pt-6 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-4">
                お困りですか？こちらの人気セクションをお試しください：
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button asChild variant="link" size="sm">
                  <Link href="/student">学生ポータル</Link>
                </Button>
                <Button asChild variant="link" size="sm">
                  <Link href="/teacher">教師ポータル</Link>
                </Button>
                <Button asChild variant="link" size="sm">
                  <Link href="/dashboard">ダッシュボード</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
