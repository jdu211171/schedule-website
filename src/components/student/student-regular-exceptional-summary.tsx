"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClassSeriesSummary, useSpecialSummary } from "@/hooks/use-class-series";

type Props = { studentId: string; days?: number };

const dayLabelsJa = ["日", "月", "火", "水", "木", "金", "土"];

export default function StudentRegularExceptionalSummary({ studentId, days = 90 }: Props) {
  const { data: summary, isLoading } = useClassSeriesSummary(studentId, days);
  const { data: special } = useSpecialSummary({ studentId });

  const rows = summary?.bySeries || [];

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>通塾まとめ（Regular / Commuting）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">次の{days}日間の予定合計</div>
          <div className="text-2xl font-semibold">{isLoading ? "…" : summary?.totalRegular ?? 0}</div>

          <div className="mt-2 divide-y rounded-md border">
            {rows.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">レギュラー授業は未設定です</div>
            )}
            {rows.map((r) => (
              <div key={r.seriesId} className="p-3 text-sm flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.subjectName ?? r.subjectId ?? "未設定"}</div>
                  <div className="text-muted-foreground">
                    {r.daysOfWeek.map((d) => dayLabelsJa[d] ?? d).join("・")} {r.startTime}–{r.endTime}
                  </div>
                </div>
                <div className="text-muted-foreground">
                  講師: <span className="font-medium">{r.teacherName ?? "—"}</span>
                  <span className="mx-2">•</span>
                  受講済み: <span className="font-medium">{r.takenCountSoFar}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>特別授業（Exceptional）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">受講済み: <span className="font-medium">{special?.takenSoFar ?? 0}</span></div>
          <div className="text-sm">今後の特別授業: <span className="font-medium">{special?.upcomingCount ?? 0}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}

