"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Props = {
  seriesId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function SeriesSessionsDrawer({
  seriesId,
  open,
  onOpenChange,
}: Props) {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/class-sessions/series/${seriesId}`, {
      headers: {
        "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "",
      },
    })
      .then((r) => r.json())
      .then((j) => setItems(j?.data || []))
      .finally(() => setLoading(false));
  }, [open, seriesId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>シリーズの授業一覧</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 text-sm">
          {loading ? (
            <div>読み込み中…</div>
          ) : items.length ? (
            <ul className="space-y-2">
              {items.slice(0, 100).map((s) => (
                <li
                  key={s.classId}
                  className={`rounded border p-2 ${s.status === "CONFLICTED" ? "border-destructive/60 bg-destructive/5" : "border-border"}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {s.date} {s.startTime}–{s.endTime}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.subjectName || s.subjectId || ""} /{" "}
                        {s.teacherName || ""} / {s.studentName || ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.isCancelled && (
                        <span className="text-[10px] px-1 rounded bg-slate-700 text-white">
                          キャンセル
                        </span>
                      )}
                      {s.status && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded border ${s.status === "CONFLICTED" ? "border-destructive text-destructive" : "text-muted-foreground"}`}
                        >
                          {s.status}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-muted-foreground">授業はありません</div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
