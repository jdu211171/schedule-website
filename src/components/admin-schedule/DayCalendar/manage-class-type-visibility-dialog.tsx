import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchClassTypeOptions } from "@/lib/class-type-options";
import { useHiddenClassTypes, useSetHiddenClassTypes } from "@/hooks/useClassTypeVisibility";
import type { ClassTypeOption } from "@/types/class-type";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ManageClassTypeVisibilityDialog({ open, onOpenChange }: Props) {
  const { data: pref, isLoading: loadingPref } = useHiddenClassTypes();
  const setHidden = useSetHiddenClassTypes();
  const [allOptions, setAllOptions] = useState<ClassTypeOption[]>([]);
  const [pendingHidden, setPendingHidden] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load all class type options (unfiltered) when opening
  useEffect(() => {
    let cancelled = false;
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const opts = await fetchClassTypeOptions();
        if (!cancelled) setAllOptions(opts);
      } catch {
        if (!cancelled) setAllOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Initialize pending state from server pref
  useEffect(() => {
    if (!open) return;
    const current = new Set((pref?.hiddenClassTypeIds ?? []).filter(Boolean));
    setPendingHidden(current);
  }, [open, pref?.hiddenClassTypeIds]);

  const hiddenCount = pendingHidden.size;
  const totalCount = allOptions.length;

  const sortedOptions = useMemo(() => {
    return [...allOptions]; // already ordered by server
  }, [allOptions]);

  const toggleHidden = (id: string) => {
    setPendingHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    const ids = Array.from(pendingHidden);
    await setHidden.mutateAsync(ids);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>授業タイプの表示管理</DialogTitle>
          <DialogDescription>
            不要な授業タイプを非表示にできます。選択した授業タイプはフィルターの候補からのみ除外されます（カレンダー表示には影響しません）。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
          <div className="text-sm text-muted-foreground">
            合計 {totalCount} 件 / 非表示 {hiddenCount} 件
          </div>

          {loading || loadingPref ? (
            <div className="text-sm text-muted-foreground">読み込み中...</div>
          ) : (
            <div className="space-y-2">
              {sortedOptions.map((opt) => {
                const checked = pendingHidden.has(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-3 text-sm">
                    <Checkbox checked={checked} onCheckedChange={() => toggleHidden(opt.value)} className="h-4 w-4" />
                    <span className="select-none">{opt.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{checked ? "非表示" : "表示"}</span>
                  </label>
                );
              })}
              {sortedOptions.length === 0 && (
                <div className="text-sm text-muted-foreground">授業タイプがありません</div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button onClick={handleSave} disabled={setHidden.isPending}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

