"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useClassSeriesList,
  useClassSeriesSummary,
  type ClassSeries,
} from "@/hooks/use-class-series";

type Props = {
  studentId: string;
  days?: number; // default window = 90 days
};

const dayLabelsJa = [
  "日", // Sun
  "月",
  "火",
  "水",
  "木",
  "金",
  "土",
];

function computeWeeklyCadence(series: ClassSeries[] | undefined): {
  label: string;
  count: number;
  days: number[];
} {
  const set = new Set<number>();
  (series || []).forEach((s) => (s.daysOfWeek || []).forEach((d) => set.add(d)));
  const days = Array.from(set.values()).sort((a, b) => a - b);
  const count = days.length;
  const label = count === 0
    ? "—"
    : `${count}日/週（${days.map((d) => dayLabelsJa[d]).join("・")}）`;
  return { label, count, days };
}

function computeExpectedEnd(series: ClassSeries[] | undefined): string {
  const dates = (series || [])
    .map((s) => s.endDate)
    .filter((d): d is string => !!d)
    .sort();
  return dates.length ? dates[dates.length - 1] : "—";
}

export default function StudentCommutingSummary({ studentId, days = 90 }: Props) {
  const { data: summary, isLoading: loadingSummary, error: errSummary } =
    useClassSeriesSummary(studentId, days);
  const { data: series, isLoading: loadingSeries } = useClassSeriesList({
    studentId,
    status: "ACTIVE",
  });

  const cadence = computeWeeklyCadence(series);
  const expectedEnd = computeExpectedEnd(series);

  return (
    <Card>
      <CardHeader>
        <CardTitle>通塾まとめ / Commuting Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Totals */}
        <div>
          <div className="text-sm text-muted-foreground">Total Commuting Classes / 合計（{days}日間）</div>
          <div className="text-2xl font-semibold">
            {loadingSummary ? "…" : errSummary ? "—" : summary?.totalRegular ?? 0}
          </div>
        </div>

        {/* Weekly cadence and expected end */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Weekly Cadence / 週あたり</div>
            <div className="text-base">
              {loadingSeries ? "…" : cadence.label}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Expected End / 予定終了</div>
            <div className="text-base">
              {loadingSeries ? "…" : expectedEnd}
            </div>
          </div>
        </div>

        {/* By subject breakdown */}
        <div>
          <div className="text-sm font-medium">By Subject / 科目別</div>
          {loadingSummary ? (
            <div className="text-sm text-muted-foreground">…</div>
          ) : (
            <ul className="mt-2 space-y-1">
              {(summary?.bySubject || []).map((row) => (
                <li key={row.subjectId} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.subjectId}</span>
                  <span className="font-medium">{row.count}</span>
                </li>
              ))}
              {(summary?.bySubject?.length ?? 0) === 0 && (
                <li className="text-sm text-muted-foreground">—</li>
              )}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

