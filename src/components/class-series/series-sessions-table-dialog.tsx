"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
// Single-table view now; we still fetch conflict preview to annotate rows
import type { ConflictResponse } from "@/components/admin-schedule/DayCalendar/types/class-session";
type ConflictData = ConflictResponse["conflicts"][number];
import { Edit3, Trash2, XCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { LessonDialog } from "@/components/admin-schedule/DayCalendar/lesson-dialog";
import FastDayCalendarDialog from "@/components/admin-schedule/DayCalendar/fast-day-calendar-dialog";
import { useAllBoothsOrdered } from "@/hooks/useBoothQuery";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useStudents } from "@/hooks/useStudentQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import type { ExtendedClassSessionWithRelations } from "@/hooks/useClassSessionQuery";

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
};

export default function SeriesSessionsTableDialog({ seriesId, open, onOpenChange, softWarningDates = [] }: Props) {
  const [items, setItems] = useState<SeriesSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editTarget, setEditTarget] = useState<SeriesSession | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<ExtendedClassSessionWithRelations | null>(null);
  const [lessonDialogMode, setLessonDialogMode] = useState<'view' | 'edit'>("edit");
  const [deleteTarget, setDeleteTarget] = useState<SeriesSession | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SeriesSession | null>(null);
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [fastDialogOpen, setFastDialogOpen] = useState(false);
  const [fastDialogDate, setFastDialogDate] = useState<string | null>(null);
  // Integrated conflict preview state
  const [preview, setPreview] = useState<ConflictResponse | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [generationMonths, setGenerationMonths] = useState<number>(1);

  const { data: booths } = useAllBoothsOrdered();
  const { data: teachersRes } = useTeachers();
  const { data: studentsRes } = useStudents();
  const { data: subjectsRes } = useSubjects();
  const teachers = teachersRes?.data || [];
  const students = studentsRes?.data || [];
  const subjects = subjectsRes?.data || [];
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [rowConflicts, setRowConflicts] = useState<Record<string, ConflictData[]>>({});
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});

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
    if (!open) {
      setSelected({});
      setEditTarget(null);
      setDeleteTarget(null);
      setPreview(null);
      return;
    }
    (async () => {
      // load generation window
      try {
        const conf = await fetch('/api/scheduling-config?scope=branch', { headers: { 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' } });
        if (conf.ok) {
          const j = await conf.json();
          const m = Number(j?.effective?.generationMonths ?? 1) || 1;
          setGenerationMonths(m);
        }
      } catch (_) {}
      await fetchItems();
      // load preview
      if (seriesId) {
        try {
          const pv = await fetch(`/api/class-series/${seriesId}/extend/preview?months=${generationMonths}`, { headers: { 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' } });
          if (pv.ok) {
            const data = await pv.json();
            setPreview(data as ConflictResponse);
          }
        } catch (_) {}
      }
    })();
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

  const conflictTypeLabel = (type: string): string => {
    switch (type) {
      case 'STUDENT_UNAVAILABLE':
        return '生徒不在';
      case 'TEACHER_UNAVAILABLE':
        return '講師不在';
      case 'STUDENT_WRONG_TIME':
        return '生徒時間不一致';
      case 'TEACHER_WRONG_TIME':
        return '講師時間不一致';
      case 'VACATION':
        return '休暇期間';
      case 'BOOTH_CONFLICT':
        return 'ブース競合';
      case 'TEACHER_CONFLICT':
        return '講師重複';
      case 'STUDENT_CONFLICT':
        return '生徒重複';
      case 'NO_SHARED_AVAILABILITY':
        return '共有枠なし';
      default:
        return '競合';
    }
  };

  const conflictTypeColor = (type: string): string => {
    switch (type) {
      case 'STUDENT_UNAVAILABLE':
      case 'TEACHER_UNAVAILABLE':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'STUDENT_WRONG_TIME':
      case 'TEACHER_WRONG_TIME':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'VACATION':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'BOOTH_CONFLICT':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'TEACHER_CONFLICT':
      case 'STUDENT_CONFLICT':
        return 'text-purple-700 bg-purple-50 border-purple-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

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
      await refreshPreview();
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
      await refreshPreview();
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
      await refreshPreview();
    } catch (e: any) {
      toast.error(e?.message || "一括削除に失敗しました");
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const confirmOne = async (classId: string) => {
    try {
      const res = await fetch('/api/class-sessions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' },
        body: JSON.stringify({ classIds: [classId] }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      toast.success(j.message || '確認しました');
      await fetchItems();
      await refreshPreview();
    } catch (_) {
      toast.error('確認に失敗しました');
    }
  };

  const confirmSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/class-sessions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' },
        body: JSON.stringify({ classIds: selectedIds }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      toast.success(j.message || '確認しました');
      setSelected({});
      await fetchItems();
      await refreshPreview();
    } catch (_) {
      toast.error('一括確認に失敗しました');
    }
  };

  const reactivateOne = async (classId: string) => {
    try {
      const res = await fetch('/api/class-sessions/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' },
        body: JSON.stringify({ classIds: [classId] }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      toast.success(j.message || '再開しました');
      await fetchItems();
      await refreshPreview();
    } catch (_) {
      toast.error('再開に失敗しました');
    }
  };

  const reactivateSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/class-sessions/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' },
        body: JSON.stringify({ classIds: selectedIds }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      toast.success(j.message || '再開しました');
      setSelected({});
      await fetchItems();
      await refreshPreview();
    } catch (_) {
      toast.error('一括再開に失敗しました');
    }
  };

  const refreshPreview = async () => {
    if (!seriesId) return;
    setResolveLoading(true);
    try {
      const pv = await fetch(`/api/class-series/${seriesId}/extend/preview?months=${generationMonths}`, { headers: { 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' } });
      if (!pv.ok) throw new Error('プレビューに失敗しました');
      const data = await pv.json();
      setPreview(data as ConflictResponse);
    } catch (e) {
      toast.error('競合プレビューの取得に失敗しました');
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
              <Button
                variant="outline"
                size="sm"
                onClick={async () => { await fetchItems(); await refreshPreview(); }}
                disabled={loading}
              >
                更新
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" disabled={selectedIds.length === 0}>
                    一括
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); confirmSelected(); }}>
                    選択を確認（ソフトのみ）
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); reactivateSelected(); }}>
                    選択を再開
                  </DropdownMenuItem>
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
                  items.flatMap((s) => {
                    const conflictsForDate = preview?.conflictsByDate?.[s.date] || [];
                    const hasConflicts = conflictsForDate.length > 0 || s.status === 'CONFLICTED';
                    const expanded = !!expandedDates[s.date];
                    const mainRow = (
                      <TableRow key={s.classId} className={hasConflicts ? 'bg-destructive/5' : ''}>
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
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            {statusBadge(s)}
                            {hasConflicts && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                                onClick={async () => {
                                  const next = !expanded;
                                  setExpandedDates((prev) => ({ ...prev, [s.date]: next }));
                                  if (next) {
                                    const previewConf = (preview?.conflictsByDate?.[s.date] || []).length;
                                    if (!previewConf && !rowConflicts[s.classId] && s.status === 'CONFLICTED') {
                                      try {
                                        setRowLoading((p) => ({ ...p, [s.classId]: true }));
                                        const r = await fetch(`/api/class-sessions/${s.classId}/conflicts`, { headers: { 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' } });
                                        if (r.ok) {
                                          const j = await r.json();
                                          setRowConflicts((p) => ({ ...p, [s.classId]: (j?.conflicts || []) as ConflictData[] }));
                                        }
                                      } catch (_) {
                                        // ignore
                                      } finally {
                                        setRowLoading((p) => ({ ...p, [s.classId]: false }));
                                      }
                                    }
                                  }
                                }}
                              >
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                詳細{expanded ? 'を隠す' : 'を見る'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            {/* Reactivate */}
                            {s.isCancelled && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => reactivateOne(s.classId)}
                                title="キャンセル解除"
                              >
                                再開
                              </Button>
                            )}
                            {/* Confirm (soft-only) */}
                            {s.status === 'CONFLICTED' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => confirmOne(s.classId)}
                                title="確認済みにする（ハード競合は不可）"
                              >
                                確認
                              </Button>
                            )}
                            {/* Edit / Resolve action */}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async () => {
                                // If conflicted, open fast day calendar dialog within this view
                                if (s.status === 'CONFLICTED') {
                                  setFastDialogDate(s.date);
                                  setFastDialogOpen(true);
                                  return;
                                }
                                // Default: open the standard edit dialog
                                try {
                                  const res = await fetch(`/api/class-sessions/${s.classId}`, { headers: { 'X-Selected-Branch': localStorage.getItem('selectedBranchId') || '' } });
                                  if (!res.ok) throw new Error();
                                  const j = await res.json();
                                  const lesson = (j?.data || j) as ExtendedClassSessionWithRelations;
                                  setSelectedLesson(lesson);
                                  setLessonDialogMode('edit');
                                } catch (_) {
                                  toast.error('授業詳細の取得に失敗しました');
                                }
                              }}
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
                    );

                    if (!hasConflicts || !expanded) return [mainRow];

                    const detailsRow = (
                      <TableRow key={`${s.classId}-details`}>
                        <TableCell></TableCell>
                        <TableCell colSpan={7} className="bg-muted/30 py-3">
                          {(() => {
                            const extra = rowConflicts[s.classId] || [];
                            const list = conflictsForDate.length ? conflictsForDate : extra;
                            if (rowLoading[s.classId]) {
                              return <div className="text-sm text-muted-foreground">取得中…</div>;
                            }
                            return list.length ? (
                              <div className="flex flex-col gap-2">
                                {list.map((c, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-sm">
                                    <span className={`px-1 py-0.5 rounded text-xs border ${conflictTypeColor(c.type)}`}>
                                      {conflictTypeLabel(c.type)}
                                    </span>
                                    <span className="text-muted-foreground">{c.details}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">競合の詳細はありません</div>
                            );
                          })()}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    );

                    return [mainRow, detailsRow];
                  })
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

        {/* Edit dialog (LessonDialog in edit mode) */}
        {selectedLesson && (
          <LessonDialog
            open={!!selectedLesson}
            onOpenChange={(o) => {
              if (!o) setSelectedLesson(null);
            }}
            lesson={selectedLesson}
            mode={lessonDialogMode}
            onModeChange={setLessonDialogMode}
            onSave={async () => {
              setSelectedLesson(null);
              await fetchItems();
              await refreshPreview();
            }}
            onDelete={async () => {
              setSelectedLesson(null);
              await fetchItems();
              await refreshPreview();
            }}
            booths={(booths || []).map((b) => ({ boothId: b.boothId, name: b.name }))}
            teachers={teachers}
            students={students}
            subjects={subjects}
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
      {/* Fast embedded day calendar dialog for conflict resolution */}
      {fastDialogOpen && fastDialogDate && (
        <FastDayCalendarDialog
          open={fastDialogOpen}
          onOpenChange={(o) => {
            setFastDialogOpen(o);
            if (!o) {
              // refresh series list + preview after edits
              fetchItems();
              refreshPreview();
            }
          }}
          date={fastDialogDate}
          onAfterChange={async () => {
            await fetchItems();
            await refreshPreview();
          }}
        />
      )}
      {/* Embedded conflict resolution now handled inside the main content */}
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
              await refreshPreview();
            } catch {
              toast.error('キャンセルに失敗しました');
            }
          }}
        />
      )}
    </Dialog>
  );
}
