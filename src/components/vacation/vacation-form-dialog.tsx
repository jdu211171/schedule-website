// src/components/vacation/vacation-form-dialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { fetcher } from "@/lib/fetcher";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SimpleDateRangePicker } from "@/components/fix-date-range-picker/simple-date-range-picker";
import { SearchableMultiSelect } from "@/components/admin-schedule/searchable-multi-select";
import {
  useVacationCreate,
  useVacationUpdate,
} from "@/hooks/useVacationMutation";
import { useAllBranchesOrdered } from "@/hooks/useBranchQuery";
import { parseYMDToLocalDate } from "@/lib/date";

// Vacation type matching the API response
type Vacation = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  isRecurring: boolean;
  notes: string | null;
  order: number | null;
  branchId: string | null;
  branchName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Form schema for vacation creation/editing
const vacationFormSchema = z
  .object({
    name: z.string().min(1, "名前は必須です").max(100),
    dateRange: z.object({
      from: z.date({
        required_error: "開始日は必須です",
      }),
      to: z.date({
        required_error: "終了日は必須です",
      }).optional(),
    }).refine(
      (data) => {
        // Ensure end date is after or equal to start date if end date exists
        if (data.to) {
          return data.to >= data.from;
        }
        return true;
      },
      {
        message: "終了日は開始日以降でなければなりません",
        path: ["to"],
      }
    ),
    isRecurring: z.boolean().default(false),
    notes: z.string().max(255).optional().nullable(),
    order: z.coerce.number().int().min(1).optional().nullable(),
    branchIds: z.array(z.string()).min(1, "最低1つの校舎を選択してください"),
  });

interface VacationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacation?: Vacation | null;
}

export function VacationFormDialog({
  open,
  onOpenChange,
  vacation,
}: VacationFormDialogProps) {
  const createVacationMutation = useVacationCreate();
  const updateVacationMutation = useVacationUpdate();
  const { data: session } = useSession();
  const isEditing = !!vacation;

  // Use ordered branches from API
  const { data: branches = [], isLoading: isBranchesLoading } = useAllBranchesOrdered();
  const assignedBranchIds = (session?.user?.branches || []).map((b) => b.branchId);
  const isAdmin = session?.user?.role === "ADMIN";
  const availableBranches = isAdmin
    ? branches
    : branches.filter((b) => assignedBranchIds.includes(b.branchId));

  // Use the selected branch from session instead of first branch
  const defaultBranchId = session?.user?.selectedBranchId || branches?.[0]?.branchId;

  const form = useForm<z.infer<typeof vacationFormSchema>>({
    resolver: zodResolver(vacationFormSchema),
    defaultValues: {
      name: vacation?.name || "",
      dateRange: {
        from: (() => {
          const base = vacation?.startDate
            ? normalizeIncomingDate(vacation.startDate)
            : new Date()
          base.setHours(12, 0, 0, 0)
          return base
        })(),
        to: (() => {
          if (!vacation?.endDate) return undefined
          const d = normalizeIncomingDate(vacation.endDate)
          d.setHours(12, 0, 0, 0)
          return d
        })(),
      },
      isRecurring: vacation?.isRecurring ?? false,
      notes: vacation?.notes ?? "",
      order: vacation?.order ?? undefined,
      branchIds: [],
    },
  });

  const [conflictState, setConflictState] = useState<
    | null
    | {
        vacationIds: string[];
        conflicts: Array<{
          classId: string;
          date: string;
          startTime: string;
          endTime: string;
          teacherName: string | null;
          studentName: string | null;
        }>;
      }
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (vacation) {
      form.reset({
        name: vacation.name || "",
        dateRange: {
          from: (() => {
            const base = vacation.startDate
              ? normalizeIncomingDate(vacation.startDate)
              : new Date()
            base.setHours(12, 0, 0, 0)
            return base
          })(),
          to: (() => {
            if (!vacation.endDate) return undefined
            const d = normalizeIncomingDate(vacation.endDate)
            d.setHours(12, 0, 0, 0)
            return d
          })(),
        },
        isRecurring: vacation.isRecurring ?? false,
        notes: vacation.notes ?? "",
        order: vacation.order ?? undefined,
        branchIds: vacation.branchId ? [vacation.branchId] : (defaultBranchId ? [defaultBranchId] : []),
      });
    } else {
      form.reset({
        name: "",
        dateRange: {
          from: (() => { const d = new Date(); d.setHours(12,0,0,0); return d })(),
          to: undefined,
        },
        isRecurring: false,
        notes: "",
        order: undefined,
        branchIds: defaultBranchId ? [defaultBranchId] : [],
      });
    }
  }, [vacation, form, defaultBranchId]);

  // Normalize incoming API date (string or Date) to a local date object (date-only semantics)
  function normalizeIncomingDate(input: string | Date): Date {
    if (typeof input === "string") {
      // If ISO string, take YMD part; if already YMD, use as-is
      const ymd = input.includes("T") ? input.slice(0, 10) : input
      return parseYMDToLocalDate(ymd)
    }
    return new Date(input)
  }

  async function onSubmit(values: z.infer<typeof vacationFormSchema>) {
    // Transform the date range to individual start and end dates for the API
    const submitValues = {
      name: values.name,
      startDate: values.dateRange.from,
      endDate: values.dateRange.to || values.dateRange.from, // If no end date, use start date
      isRecurring: values.isRecurring,
      notes: values.notes ?? "", // Ensure notes is at least an empty string, not undefined
      order: values.order,
    };

    // Then trigger the mutation(s)
    const selectedBranchIds = values.branchIds && values.branchIds.length > 0
      ? values.branchIds
      : (defaultBranchId ? [defaultBranchId] : []);

    setSubmitting(true);
    try {
      if (isEditing && vacation) {
        // Sync across selected branches and update fields
        try {
          await updateVacationMutation.mutateAsync({
            vacationId: vacation.id,
            ...submitValues,
            branchIds: selectedBranchIds,
          });
          onOpenChange(false);
          form.reset();
        } catch (err: any) {
          if (err?.status === 409 && (err.info?.vacationIds || err.info?.data?.length) && err.info?.conflicts) {
            const vIds: string[] = err.info.vacationIds || (err.info.data || []).map((v: any) => v.id);
            const { toast } = await import("sonner");
            toast.message?.("休日期間と重複する授業が見つかりました。確認してください。");
            setConflictState({ vacationIds: vIds, conflicts: err.info.conflicts });
            return;
          }
          throw err;
        }
      } else {
        // Create one vacation per selected branch (sequentially)
        const aggregatedVacationIds: string[] = [];
        const aggregatedConflicts: Array<{
          classId: string;
          date: string;
          startTime: string;
          endTime: string;
          teacherName: string | null;
          studentName: string | null;
        }> = [];

        for (const bId of selectedBranchIds) {
          try {
            const res = await createVacationMutation.mutateAsync({
              ...submitValues,
              branchId: bId,
            });
            // success path: nothing to collect
          } catch (err: any) {
            if (err?.status === 409 && (err.info?.data?.[0]?.id || err.info?.vacationIds) && err.info?.conflicts) {
              // Collect conflicts instead of returning immediately
              const vIds: string[] = err.info.vacationIds || [err.info.data[0].id];
              aggregatedVacationIds.push(...vIds);
              aggregatedConflicts.push(...err.info.conflicts);
              continue;
            }
            throw err;
          }
        }
        if (aggregatedVacationIds.length > 0) {
          const { toast } = await import("sonner");
          toast.message?.("休日期間と重複する授業が見つかりました。確認してください。");
          setConflictState({ vacationIds: aggregatedVacationIds, conflicts: aggregatedConflicts });
          return;
        }
        onOpenChange(false);
        form.reset();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <Dialog
      open={open}
      modal={false}
      onOpenChange={(open) => {
        if (!open) {
          // Reset form when dialog is closed
          form.reset();
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "休日の編集" : "休日の作成"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                    名前
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="休日名を入力してください" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range Picker */}
            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                    期間
                  </FormLabel>
                  <FormControl>
                    <SimpleDateRangePicker
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="期間を選択してください"
                      showPresets={true}
                      disablePastDates={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Is Recurring Switch */}
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>定期休日</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Order Field */}
            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>表示順序</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="例: 1, 2, 3..."
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? undefined : value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    数値が小さいほど上に表示されます。空欄の場合は自動的に最後に配置されます。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Branch Assignment Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  校舎配属
                </h3>
                <Separator className="flex-1" />
              </div>

              <FormField
                control={form.control}
                name="branchIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium after:content-['*'] after:ml-1 after:text-destructive">
                      適用校舎（複数選択可）
                    </FormLabel>
                    <FormControl>
                      <div className="mb-6">
                        <SearchableMultiSelect
                          value={field.value || []}
                          onValueChange={field.onChange}
                          items={availableBranches.map((branch) => ({
                            value: branch.branchId,
                            label: branch.name,
                          }))}
                          placeholder="校舎を選択してください"
                          searchPlaceholder="校舎名を検索..."
                          emptyMessage="該当する校舎が見つかりません"
                          loading={isBranchesLoading}
                          disabled={isBranchesLoading}
                          defaultValues={defaultBranchId ? [defaultBranchId] : []}
                          renderSelectedBadge={(item, isDefault, onRemove) => (
                            <Badge
                              key={item.value}
                              variant={isDefault ? "default" : "secondary"}
                              className="flex items-center gap-1 px-3 py-1"
                            >
                              <span>{item.label}</span>
                              {isDefault && (
                                <span className="text-xs">(デフォルト)</span>
                              )}
                              {!isDefault && onRemove && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1 hover:bg-muted rounded-full"
                                  onClick={onRemove}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </Badge>
                          )}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                    {defaultBranchId && (
                      <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded-md">
                        💡
                        デフォルト校舎は自動的に選択され、削除することはできません
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メモ</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="メモを入力してください（任意）"
                      {...field}
                      value={field.value ?? ""} // Ensure value is never null
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? (isEditing ? "保存中..." : "作成中...") : (isEditing ? "変更を保存" : "作成")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Conflict confirmation dialog */}
    <AlertDialog open={!!conflictState} onOpenChange={(open) => !open && setConflictState(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>休日期間と重複する授業があります</AlertDialogTitle>
          <AlertDialogDescription>
            以下の授業をキャンセルして休日を確定しますか？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="max-h-60 overflow-auto border rounded-md p-2 text-sm">
          {conflictState?.conflicts.slice(0, 20).map((c) => (
            <div key={c.classId} className="flex items-center justify-between py-1 border-b last:border-b-0">
              <div>
                <div className="font-medium">{c.date} {c.startTime}-{c.endTime}</div>
                <div className="text-muted-foreground">{c.teacherName || "-"} / {c.studentName || "-"}</div>
              </div>
            </div>
          ))}
          {conflictState && conflictState.conflicts.length > 20 && (
            <div className="text-xs text-muted-foreground mt-2">他 {conflictState.conflicts.length - 20} 件...</div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConflictState(null)}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirming}
            onClick={async () => {
              if (!conflictState) return;
              setConfirming(true);
              try {
                let totalDeleted = 0;
                let unauthorized = 0;
                let failures = 0;
                for (const vId of conflictState.vacationIds) {
                  try {
                    const res = await fetcher<{ deleted: number; message?: string }>(
                      `/api/class-sessions/by-vacation/${vId}`,
                      { method: "DELETE" }
                    );
                    totalDeleted += res.deleted || 0;
                  } catch (err: any) {
                    if (err?.status === 403) unauthorized++;
                    else failures++;
                  }
                }
                const { toast } = await import("sonner");
                if (totalDeleted > 0) {
                  toast.success(`${totalDeleted}件の授業をキャンセルしました`);
                }
                if (unauthorized > 0) {
                  toast.error(`${unauthorized}件の校舎に対する権限がありませんでした`);
                }
                if (failures > 0 && totalDeleted === 0) {
                  toast.error(`キャンセルに失敗しました（${failures}件）`);
                }
                setConflictState(null);
                onOpenChange(false);
                form.reset();
              } catch (e: any) {
                const { toast } = await import("sonner");
                const msg = e?.info?.error || e?.message || "キャンセルに失敗しました";
                toast.error(msg);
              } finally {
                setConfirming(false);
              }
            }}
          >
            {confirming ? "処理中..." : "授業をキャンセルして続行"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
