import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center space-y-6">
        <Badge variant="outline" className="text-lg px-4 py-2">
          404
        </Badge>

        <h1 className="text-4xl font-bold tracking-tight">
          ページが見つかりません
        </h1>

        <p className="text-muted-foreground max-w-md">
          申し訳ございませんが、お探しのページは存在しないか、移動された可能性があります。
        </p>

        <Button asChild>
          <Link href="/">
            ホームに戻る
          </Link>
        </Button>
      </div>
    </div>
  );
}
