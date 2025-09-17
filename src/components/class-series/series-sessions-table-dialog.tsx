"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/admin-schedule/confirm-delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog as UiDialog, DialogContent as UiDialogContent, DialogHeader as UiDialogHeader, DialogTitle as UiDialogTitle } from "@/components/ui/dialog";
import { ConflictResolutionTable } from "@/components/admin-schedule/DayCalendar/conflict-resolution-table";
import type { ConflictResponse, SessionAction } from "@/components/admin-schedule/DayCalendar/types/class-session";
import { Edit3, Trash2, XCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { CreateLessonDialog } from "@/components/admin-schedule/DayCalendar/create-lesson-dialog";
import { useAllBoothsOrdered } from "@/hooks/useBoothQuery";

type Props = {
  seriesId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional list of YYYY-MM-DD dates with availability warnings (soft)
  softWarningDates?: string[];
};

type SeriesSession = {
  classId: string;
  seriesId: string | null;
  teacherId: string | null;
  teacherName: string | null;
  studentId: string | null;
  studentName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  classTypeId: string | null;
  classTypeName: string | null;
  boothId: string | null;
  boothName: string | null;
  branchId: string | null;
  branchName: string | null;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: number | null;
  notes: string | null;
  status?: string | null; // e.g., 'CONFLICTED'
  isCancelled?: boolean;
  cancellationReason?: string | null;
};

export default function SeriesSessionsTableDialog({ seriesId, open, onOpenChange, softWarningDates = [] }: Props) {
  const [items, setItems] = useState<SeriesSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editTarget, setEditTarget] = useState<SeriesSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SeriesSession | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SeriesSession | null>(null);
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  // Resolve preview state
  const [showResolve, setShowResolve] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [preview, setPreview] = useState<ConflictResponse | null>(null);
  const [seriesStartEnd, setSeriesStartEnd] = useState<{ startTime: string; endTime: string } | null>(null);

  const { data: booths } = useAllBoothsOrdered();

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );

  const fetchItems = async () => {
    if (!seriesId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/class-sessions/series/${seriesId}`, {
        headers: { "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "" },
      });
      const j = await res.json();
      setItems(j?.data || []);
    } catch (e) {
      toast.error("授業の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchItems();
    } else {
      setSelected({});
      setEditTarget(null);
      setDeleteTarget(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seriesId]);

  const allSelected = items.length > 0 && items.every((i) => selected[i.classId]);
  const someSelected = items.some((i) => selected[i.classId]) && !allSelected;

  const toggleAll = (value: boolean) => {
    const next: Record<string, boolean> = {};
    if (value) items.forEach((i) => (next[i.classId] = true));
    setSelected(next);
  };

  const softSet = useMemo(() => new Set(softWarningDates || []), [softWarningDates]);

  const statusBadge = (s: SeriesSession) => {
    if (s.isCancelled) {
      return <Badge variant="secondary" className="bg-slate-100 text-slate-700">キャンセル</Badge>;
    }
    if (s.status === "CONFLICTED") {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-destructive/60 bg-destructive/5 px-2 py-0.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" /> 競合
        </span>
      );
    }
    if (softSet.has(s.date)) {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" /> 時間外
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> OK
      </span>
    );
  };

  const cancelSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/class-sessions/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "",
        },
        body: JSON.stringify({ classIds: selectedIds }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      toast.success(j.message || "キャンセルしました");
      await fetchItems();
    } catch {
      toast.error("キャンセルに失敗しました");
    } finally {
      setBulkCancelOpen(false);
    }
  };

  const deleteOne = async (classId: string) => {
    try {
      const res = await fetch(`/api/class-sessions/${classId}`, {
        method: "DELETE",
        headers: { "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "" },
      });
      if (!res.ok) throw new Error();
      toast.success("授業を削除しました");
      await fetchItems();
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setDeleteTarget(null);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/class-sessions/${id}`, {
            method: "DELETE",
            headers: { "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "" },
          }).then((r) => {
            if (!r.ok) return r.json().then((j) => Promise.reject(new Error(j?.error || "")));
          })
        )
      );
      toast.success(`${selectedIds.length}件の授業を削除しました`);
      setSelected({});
      await fetchItems();
    } catch (e: any) {
      toast.error(e?.message || "一括削除に失敗しました");
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const loadSeriesInfo = async () => {
    if (!seriesId) return null;
    const r = await fetch(`/api/class-series/${seriesId}`, { headers: { 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' } });
    if (!r.ok) return null;
    const j = await r.json();
    return { startTime: j?.startTime as string, endTime: j?.endTime as string };
  };

  const openResolve = async () => {
    if (!seriesId) return;
    setResolveLoading(true);
    try {
      const info = await loadSeriesInfo();
      setSeriesStartEnd(info || { startTime: '09:00', endTime: '10:00' });
      const pv = await fetch(`/api/class-series/${seriesId}/extend/preview?months=1`, { headers: { 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' } });
      if (!pv.ok) throw new Error('プレビューに失敗しました');
      const data = await pv.json();
      setPreview(data as ConflictResponse);
      setShowResolve(true);
    } catch (e) {
      toast.error('競合プレビューの取得に失敗しました');
    } finally {
      setResolveLoading(false);
    }
  };

  const applyResolution = async (actions: SessionAction[]) => {
    if (!seriesId) return;
    setResolveLoading(true);
    try {
      const res = await fetch(`/api/class-series/${seriesId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' },
        body: JSON.stringify({ months: 1, sessionActions: actions }),
      });
      if (!res.ok) throw new Error();
      toast.success('拡張しました');
      setShowResolve(false);
      setPreview(null);
      await fetchItems();
    } catch {
      toast.error('拡張に失敗しました');
    } finally {
      setResolveLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(1100px,100vw-2rem)] sm:max-w-[1100px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>シリーズの授業一覧</DialogTitle>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto">
          {/* Toolbar */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div>合計: {items.length}件</div>
              {selectedIds.length > 0 && <div>選択: {selectedIds.length}件</div>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={openResolve} disabled={resolveLoading || !seriesId}>
                競合解決
              </Button>
              <Button variant="outline" size="sm" onClick={fetchItems} disabled={loading}>
                更新
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" disabled={selectedIds.length === 0}>
                    一括
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setBulkCancelOpen(true); }}>
                    選択をキャンセル
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(e) => { e.preventDefault(); setBulkDeleteOpen(true); }}
                  >
                    選択を削除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[960px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-9">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={allSelected || (someSelected && "indeterminate") as any}
                        onCheckedChange={(v) => toggleAll(!!v)}
                        aria-label="全選択"
                      />
                    </div>
                  </TableHead>
                  <TableHead>日付</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead>科目</TableHead>
                  <TableHead>講師</TableHead>
                  <TableHead>生徒</TableHead>
                  <TableHead>ブース</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div className="py-6 text-center text-sm text-muted-foreground">読み込み中…</div>
                    </TableCell>
                  </TableRow>
                ) : items.length ? (
                  items.map((s) => (
                    <TableRow key={s.classId} className={s.status === 'CONFLICTED' ? 'bg-destructive/5' : ''}>
                      <TableCell className="w-9">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={!!selected[s.classId]}
                            onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [s.classId]: !!v }))}
                            aria-label="行を選択"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{s.date}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{s.startTime}–{s.endTime}</TableCell>
                      <TableCell className="text-sm">{s.subjectName || s.subjectId || '—'}</TableCell>
                      <TableCell className="text-sm">{s.teacherName || s.teacherId || '—'}</TableCell>
                      <TableCell className="text-sm">{s.studentName || s.studentId || '—'}</TableCell>
                      <TableCell className="text-sm">{s.boothName || s.boothId || '—'}</TableCell>
                      <TableCell className="text-sm">{statusBadge(s)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                        {/* Edit via CreateLessonDialog */}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditTarget(s)}
                          title="編集"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {/* Cancel */}
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCancelTarget(s)}
                          title="キャンセル"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        {/* Delete */}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteTarget(s)}
                          title="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className="py-6 text-center text-sm text-muted-foreground">授業はありません</div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>閉じる</Button>
        </DialogFooter>

        {/* Edit dialog (CreateLessonDialog) */}
        {editTarget && (
          <CreateLessonDialog
            open={!!editTarget}
            onOpenChange={(o) => !o && setEditTarget(null)}
            lessonData={{
              date: new Date(editTarget.date),
              startTime: editTarget.startTime,
              endTime: editTarget.endTime,
              boothId: editTarget.boothId || "",
              classTypeId: editTarget.classTypeId || undefined,
              teacherId: editTarget.teacherId || undefined,
              studentId: editTarget.studentId || undefined,
            }}
            booths={(booths || []).map((b) => ({ boothId: b.boothId, name: b.name }))}
            onSave={async (payload) => {
              try {
                // Map CreateLessonDialog payload to PATCH for a single class
                const res = await fetch(`/api/class-sessions/${editTarget.classId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' },
                  body: JSON.stringify({
                    teacherId: payload.teacherId,
                    studentId: payload.studentId,
                    subjectId: payload.subjectId,
                    classTypeId: payload.classTypeId,
                    boothId: payload.boothId,
                    date: payload.date ? (typeof payload.date === 'string' ? payload.date : (payload.date as Date).toISOString().slice(0,10)) : editTarget.date,
                    startTime: payload.startTime,
                    endTime: payload.endTime,
                    notes: payload.notes,
                  }),
                });
                if (!res.ok) {
                  const j = await res.json().catch(() => ({}));
                  throw new Error(j?.error || '更新に失敗しました');
                }
                toast.success('授業を更新しました');
                setEditTarget(null);
                await fetchItems();
                return { success: true } as any;
              } catch (e: any) {
                toast.error(e?.message || '更新に失敗しました');
                return { success: false } as any;
              }
            }}
          />
        )}

        {/* Delete confirm */}
        {deleteTarget && (
          <ConfirmDeleteDialog
            open={!!deleteTarget}
            onOpenChange={(o) => !o && setDeleteTarget(null)}
            title="授業の削除"
            description={`この授業（${deleteTarget.date} ${deleteTarget.startTime}）を削除します。よろしいですか？`}
            confirmText="削除"
            isLoading={false}
            onConfirm={() => deleteOne(deleteTarget.classId)}
          />
        )}
      </DialogContent>
      {/* Resolve Conflicts Dialog */}
      {showResolve && preview && seriesStartEnd && (
        <UiDialog open={showResolve} onOpenChange={(o) => setShowResolve(o)}>
          <UiDialogContent className="max-w-[min(1200px,100vw-2rem)] max-h-[90vh]">
            <UiDialogHeader>
              <UiDialogTitle>シリーズの競合解決</UiDialogTitle>
            </UiDialogHeader>
            <div className="min-h-0">
              <ConflictResolutionTable
                conflictData={preview}
                originalTime={seriesStartEnd}
                onSubmit={applyResolution}
                onCancel={() => setShowResolve(false)}
                isLoading={resolveLoading}
              />
            </div>
          </UiDialogContent>
        </UiDialog>
      )}
      {/* Bulk delete confirm */}
      {bulkDeleteOpen && (
        <ConfirmDeleteDialog
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          title="選択した授業を削除"
          description={`選択中の ${selectedIds.length} 件の授業を削除します。よろしいですか？この操作は取り消せません。`}
          confirmText="一括削除"
          onConfirm={deleteSelected}
        />
      )}
      {/* Bulk cancel confirm */}
      {bulkCancelOpen && (
        <ConfirmDeleteDialog
          open={bulkCancelOpen}
          onOpenChange={setBulkCancelOpen}
          title="選択した授業をキャンセル"
          description={`選択中の ${selectedIds.length} 件の授業をキャンセル状態にします。削除ではありません。よろしいですか？`}
          confirmText="一括キャンセル"
          onConfirm={cancelSelected}
        />
      )}
      {/* Single cancel confirm */}
      {cancelTarget && (
        <ConfirmDeleteDialog
          open={!!cancelTarget}
          onOpenChange={(o) => !o && setCancelTarget(null)}
          title="授業のキャンセル"
          description={`この授業（${cancelTarget.date} ${cancelTarget.startTime}）をキャンセル状態にします。削除ではありません。よろしいですか？`}
          confirmText="キャンセル"
          onConfirm={async () => {
            try {
              const res = await fetch('/api/class-sessions/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' },
                body: JSON.stringify({ classIds: [cancelTarget.classId] }),
              });
              if (!res.ok) throw new Error();
              const j = await res.json();
              toast.success(j.message || 'キャンセルしました');
              setCancelTarget(null);
              await fetchItems();
            } catch {
              toast.error('キャンセルに失敗しました');
            }
          }}
        />
      )}
    </Dialog>
  );
}
