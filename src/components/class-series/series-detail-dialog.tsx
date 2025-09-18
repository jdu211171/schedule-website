"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAllBoothsOrdered } from "@/hooks/useBoothQuery";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useStudents } from "@/hooks/useStudentQuery";
import { useClassSeries, useExtendClassSeries, useUpdateClassSeries } from "@/hooks/use-class-series";
import { toast } from "sonner";
import { DatePicker } from "@/components/date-picker";
import { /* Switch */ } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

type Props = { seriesId: string; open: boolean; onOpenChange: (open: boolean) => void };

export default function SeriesDetailDialog({ seriesId, open, onOpenChange }: Props) {
  const { data: series } = useClassSeries(seriesId);
  const update = useUpdateClassSeries(seriesId);
  const extend = useExtendClassSeries(seriesId);

  const { data: teachersResp } = useTeachers({ limit: 100, status: "ACTIVE" });
  const { data: studentsResp } = useStudents({ limit: 100, status: "ACTIVE" });
  const { data: booths } = useAllBoothsOrdered();

  const [months, setMonths] = useState(1);

  const dowsJa = ["日","月","火","水","木","金","土"];
  const dowsLabel = useMemo(() => (series?.daysOfWeek || []).map(d => dowsJa[d] || String(d)).join("・"), [series?.daysOfWeek]);

  const onQuickExtend = async (m: number) => {
    toast.promise(extend.mutateAsync(m), {
      loading: "生成中...",
      success: `${m}ヶ月分を生成しました`,
      error: "生成に失敗しました",
    });
  };

  // Local editable state with deferred save
  type FormState = {
    generationMode: string;
    status: string;
    teacherId: string | null;
    studentId: string | null;
    boothId: string | null;
    startDate: string; // YYYY-MM-DD
    endDate: string | null; // YYYY-MM-DD | null
    daysOfWeek: number[];
  };
  const initialForm: FormState = useMemo(() => ({
    generationMode: series?.generationMode ?? "ON_DEMAND",
    status: series?.status ?? "ACTIVE",
    teacherId: series?.teacherId ?? null,
    studentId: series?.studentId ?? null,
    boothId: series?.boothId ?? null,
    startDate: series?.startDate ?? "",
    endDate: series?.endDate ?? null,
    daysOfWeek: (series?.daysOfWeek || []).slice(),
  }), [series?.generationMode, series?.status, series?.teacherId, series?.studentId, series?.boothId, series?.startDate, series?.endDate, series?.conflictPolicy]);
  const [form, setForm] = useState<FormState>(initialForm);
  useEffect(() => setForm(initialForm), [initialForm, open]);

  const isDirty = useMemo(() => {
    return (
      form.generationMode !== (series?.generationMode ?? "ON_DEMAND") ||
      form.status !== (series?.status ?? "ACTIVE") ||
      form.teacherId !== (series?.teacherId ?? null) ||
      form.studentId !== (series?.studentId ?? null) ||
      form.boothId !== (series?.boothId ?? null) ||
      form.startDate !== (series?.startDate ?? "") ||
      form.endDate !== (series?.endDate ?? null) ||
      JSON.stringify(form.daysOfWeek) !== JSON.stringify(series?.daysOfWeek || [])
    );
  }, [form, series?.generationMode, series?.status, series?.teacherId, series?.studentId, series?.boothId, series?.startDate, series?.endDate]);

  const save = async () => {
    if (!series) return;
    const patch: Record<string, any> = {};
    if (form.generationMode !== series.generationMode) patch.generationMode = form.generationMode;
    if (form.status !== series.status) patch.status = form.status;
    if (form.teacherId !== series.teacherId) patch.teacherId = form.teacherId;
    if (form.studentId !== series.studentId) patch.studentId = form.studentId;
    if (form.boothId !== series.boothId) patch.boothId = form.boothId;
    if (form.startDate && form.startDate !== series.startDate) patch.startDate = form.startDate;
    if (form.endDate !== series.endDate) patch.endDate = form.endDate;
    if (JSON.stringify(form.daysOfWeek) !== JSON.stringify(series.daysOfWeek || [])) {
      patch.daysOfWeek = form.daysOfWeek;
    }
    if (Object.keys(patch).length === 0) return;
    try {
      await update.mutateAsync(patch as any);
      toast.success("保存しました");
    } catch {
      toast.error("保存に失敗しました");
    }
  };

  const reset = () => setForm(initialForm);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="text-base">シリーズ詳細</DialogTitle>
        </DialogHeader>

        {!series ? (
          <div className="text-sm text-muted-foreground">読み込み中…</div>
        ) : (
          <div className="space-y-5">
            {/* Status / Mode */}
            <div className="text-sm">
              <div className="text-muted-foreground">状態 / 生成モード</div>
              <div className="flex items-center gap-2 mt-1">
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="PAUSED">PAUSED</SelectItem>
                    <SelectItem value="ENDED">ENDED</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={form.generationMode} onValueChange={(v) => setForm((f) => ({ ...f, generationMode: v }))}>
                  <SelectTrigger className="h-8 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ON_DEMAND">手動（ON_DEMAND）</SelectItem>
                    <SelectItem value="ADVANCE">自動（ADVANCE）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* コンフリクト設定はグローバル/ブランチ設定に移動済み */}

            {/* Core assignments */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>講師</Label>
                <Select value={(form.teacherId ?? "none") as string} onValueChange={(v) => setForm((f) => ({ ...f, teacherId: v === "none" ? null : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="講師を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {(teachersResp?.data || []).map(t => (
                      <SelectItem key={t.teacherId} value={t.teacherId}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>生徒</Label>
                <Select value={(form.studentId ?? "none") as string} onValueChange={(v) => setForm((f) => ({ ...f, studentId: v === "none" ? null : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="生徒を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {(studentsResp?.data || []).map(s => (
                      <SelectItem key={s.studentId} value={s.studentId}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>ブース</Label>
                <Select value={(form.boothId ?? "none") as string} onValueChange={(v) => setForm((f) => ({ ...f, boothId: v === "none" ? null : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="ブースを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {(booths || []).map(b => (
                      <SelectItem key={b.boothId} value={b.boothId}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">開始日</div>
                <div className="flex flex-col gap-1 mt-1">
                  <DatePicker
                    value={form.startDate ? new Date(`${form.startDate}T00:00:00Z`) : undefined}
                    onChange={(d) => {
                      if (!d) return setForm((f) => ({ ...f, startDate: "" }));
                      const y = d.getUTCFullYear();
                      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
                      const da = String(d.getUTCDate()).padStart(2, '0');
                      setForm((f) => ({ ...f, startDate: `${y}-${m}-${da}` }));
                    }}
                  />
                  <div className="text-[11px] text-muted-foreground">{series.startTime}</div>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">終了日</div>
                <div className="flex flex-col gap-1 mt-1">
                  <DatePicker
                    value={form.endDate ? new Date(`${form.endDate}T00:00:00Z`) : undefined}
                    onChange={(d) => {
                      if (!d) return setForm((f) => ({ ...f, endDate: null }));
                      const y = d.getUTCFullYear();
                      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
                      const da = String(d.getUTCDate()).padStart(2, '0');
                      setForm((f) => ({ ...f, endDate: `${y}-${m}-${da}` }));
                    }}
                  />
                  <div className="text-[11px] text-muted-foreground">{series.endTime}</div>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">曜日</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["日","月","火","水","木","金","土"] as const).map((lbl, idx) => {
                    const checked = form.daysOfWeek.includes(idx);
                    return (
                      <label key={idx} className="flex items-center gap-1.5 text-xs select-none">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            setForm((f) => {
                              const set = new Set(f.daysOfWeek);
                              if (v) set.add(idx);
                              else set.delete(idx);
                              return { ...f, daysOfWeek: Array.from(set).sort((a,b)=>a-b) };
                            });
                          }}
                        />
                        <span>{lbl}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setForm(f => ({ ...f, daysOfWeek: [1,2,3,4,5] }))}>平日</Button>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setForm(f => ({ ...f, daysOfWeek: [0,6] }))}>土日</Button>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setForm(f => ({ ...f, daysOfWeek: [0,1,2,3,4,5,6] }))}>全選択</Button>
                  <Button variant="secondary" size="sm" className="h-7 px-2 text-xs" onClick={() => setForm(f => ({ ...f, daysOfWeek: [] }))}>クリア</Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Generate controls */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label>生成（月数）</Label>
                <Input type="number" min={1} max={12} value={months} onChange={(e) => setMonths(Math.max(1, Math.min(12, Number(e.target.value || 1))))} />
              </div>
              <Button onClick={() => onQuickExtend(months)} disabled={extend.isPending}>生成</Button>
              <Button variant="outline" onClick={() => onQuickExtend(3)} disabled={extend.isPending}>+3ヶ月</Button>
              <Button variant="outline" onClick={() => onQuickExtend(6)} disabled={extend.isPending}>+6ヶ月</Button>
            </div>

            {/* Danger zone: cancel all */}
            <Separator />
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">一括操作</div>
              <div className="flex items-center gap-2">
                <CancelAllButton seriesId={series.seriesId} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 gap-2">
          <div className="mr-auto text-xs text-muted-foreground">{isDirty ? "未保存の変更があります" : ""}</div>
          <Button variant="outline" onClick={reset} disabled={!isDirty || update.isPending}>リセット</Button>
          <Button onClick={save} disabled={!isDirty || update.isPending}>{update.isPending ? "保存中..." : "保存"}</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Inline cancel-all button with confirm
function CancelAllButton({ seriesId }: { seriesId: string }) {
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const doCancel = async () => {
    try {
      setPending(true);
      // Format today's local date as YYYY-MM-DD to cancel future sessions only
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const fromDate = `${y}-${m}-${d}`;
      const res = await fetch('/api/class-sessions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' },
        body: JSON.stringify({ seriesId, fromDate }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      toast.success(j.message || 'キャンセルしました');
    } catch {
      toast.error('一括キャンセルに失敗しました');
    } finally {
      setPending(false);
      setConfirming(false);
    }
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setConfirming(true)} disabled={pending}>すべてキャンセル</Button>
      {confirming && (
        <Dialog open={confirming} onOpenChange={(o) => !o && setConfirming(false)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>本当にキャンセルしますか？</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">このシリーズに紐づく本日以降の通常授業をキャンセル状態にします（取り消し不可）。過去の授業は変更しません。</div>
            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={pending}>やめる</Button>
              <Button variant="destructive" onClick={doCancel} disabled={pending}>{pending ? '処理中...' : 'キャンセルする'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
