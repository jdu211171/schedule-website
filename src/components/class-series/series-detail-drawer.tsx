"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useBooths, useAllBoothsOrdered } from "@/hooks/useBoothQuery";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useStudents } from "@/hooks/useStudentQuery";
import { useClassSeries, useUpdateClassSeries, useExtendClassSeries } from "@/hooks/use-class-series";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type Props = {
  seriesId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SeriesDetailDrawer({ seriesId, open, onOpenChange }: Props) {
  const { data: series } = useClassSeries(seriesId);
  const updateMutation = useUpdateClassSeries(seriesId);
  const extendMutation = useExtendClassSeries(seriesId);

  const { data: teachersResp } = useTeachers({ limit: 100, status: "ACTIVE" });
  const { data: studentsResp } = useStudents({ limit: 100, status: "ACTIVE" });
  const { data: booths } = useAllBoothsOrdered();

  const [months, setMonths] = useState<number>(1);

  const dowsJa = ["日", "月", "火", "水", "木", "金", "土"];
  const dowsLabel = useMemo(() => {
    const list = (series?.daysOfWeek || []).map((d) => dowsJa[d] || String(d));
    return list.length ? list.join("・") : "—";
  }, [series?.daysOfWeek]);

  const onUpdate = async (patch: Record<string, unknown>) => {
    await updateMutation.mutateAsync(patch as any);
  };

  const onExtend = async () => {
    await extendMutation.mutateAsync(months || 1);
  };

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingSessions(true);
    fetch(`/api/class-sessions/series/${seriesId}`, {
      headers: { "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "" },
    })
      .then((r) => r.json())
      .then((j) => setSessions(j?.data || []))
      .finally(() => setLoadingSessions(false));
  }, [open, seriesId]);

  // Conflict analysis (using blueprint)
  const [conflicts, setConflicts] = useState<any[] | null>(null);
  const [conflictSummary, setConflictSummary] = useState<any | null>(null);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const canAnalyze = series?.teacherId && series?.studentId && series?.startDate && series?.endDate && (series?.daysOfWeek?.length || 0) > 0;

  const analyzeConflicts = async () => {
    if (!canAnalyze || !series) return;
    setLoadingConflicts(true);
    const payload = {
      teacherId: series.teacherId,
      studentId: series.studentId,
      startDate: series.startDate,
      endDate: series.endDate ?? series.startDate,
      daysOfWeek: series.daysOfWeek,
      startTime: series.startTime,
      endTime: series.endTime,
    };
    try {
      const res = await fetch(`/api/availability-conflicts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setConflicts(json.conflicts || []);
      setConflictSummary(json.summary || null);
    } finally {
      setLoadingConflicts(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Series Blueprint</SheetTitle>
        </SheetHeader>

        {!series ? (
          <div className="mt-4 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="mt-4 space-y-6">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Series ID</div>
              <div className="text-sm font-mono break-all">{series.seriesId}</div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">概要</TabsTrigger>
                <TabsTrigger value="sessions">授業一覧</TabsTrigger>
                <TabsTrigger value="conflicts">衝突チェック</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Teacher</Label>
                <Select
                  value={series.teacherId ?? "none"}
                  onValueChange={(v) => onUpdate({ teacherId: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {(teachersResp?.data || []).map((t) => (
                      <SelectItem key={t.teacherId} value={t.teacherId}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Student</Label>
                <Select
                  value={series.studentId ?? "none"}
                  onValueChange={(v) => onUpdate({ studentId: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {(studentsResp?.data || []).map((s) => (
                      <SelectItem key={s.studentId} value={s.studentId}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Booth</Label>
                <Select
                  value={series.boothId ?? "none"}
                  onValueChange={(v) => onUpdate({ boothId: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select booth" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {(booths || []).map((b) => (
                      <SelectItem key={b.boothId} value={b.boothId}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              </div>

              <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Start</div>
                <div>{series.startDate} {series.startTime}</div>
              </div>
              <div>
                <div className="text-muted-foreground">End</div>
                <div>{series.endDate ?? "—"} {series.endTime}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Duration</div>
                <div>{series.duration ?? "—"} min</div>
              </div>
              <div>
                <div className="text-muted-foreground">Days</div>
                <div>{dowsLabel}</div>
              </div>
            </div>

            <Separator />

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Extend months</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={months}
                  onChange={(e) => setMonths(Math.max(1, Math.min(12, Number(e.target.value || 1))))}
                />
              </div>
              <Button onClick={onExtend} disabled={extendMutation.isPending}>
                Extend
              </Button>
            </div>

              
              </TabsContent>

              <TabsContent value="sessions" className="space-y-2">
                {loadingSessions ? (
                  <div className="text-sm text-muted-foreground">読み込み中…</div>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {sessions.map((s) => (
                      <div key={s.classId} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                        <div>
                          <div>{s.date} {s.startTime}–{s.endTime}</div>
                          <div className="text-muted-foreground">{s.subjectName || s.subjectId || ""} / {s.teacherName || ""} / {s.studentName || ""}</div>
                        </div>
                        <div>
                          {s.status ? (
                            <Badge variant={s.status === 'CONFIRMED' ? 'outline' : 'destructive'}>{s.status}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {sessions.length === 0 && (
                      <div className="text-sm text-muted-foreground">授業はありません</div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="conflicts" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Teacher/Studentの可用性に基づく衝突をチェックします。</div>
                  <Button size="sm" onClick={analyzeConflicts} disabled={!canAnalyze || loadingConflicts}>
                    {loadingConflicts ? '解析中…' : '解析'}
                  </Button>
                </div>
                {conflictSummary && (
                  <div className="text-sm">対象日数: {conflictSummary.totalRequestedDates} / 衝突: {conflictSummary.conflictDates} / 利用可: {conflictSummary.availableDates}</div>
                )}
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {(conflicts || []).map((c: any, idx: number) => (
                    <div key={idx} className="rounded border p-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div>{c.date} {c.requestedTime}</div>
                        <Badge variant="destructive">衝突</Badge>
                      </div>
                      <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                        {(c.conflicts || []).map((r: any, i: number) => (
                          <li key={i}>{r.type} — {r.participant?.name}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {conflicts && conflicts.length === 0 && (
                    <div className="text-sm text-muted-foreground">衝突は見つかりませんでした</div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default SeriesDetailDrawer;
