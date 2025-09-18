"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Config = {
  markTeacherUnavailable: boolean;
  markStudentUnavailable: boolean;
  markTeacherWrongTime: boolean;
  markStudentWrongTime: boolean;
  markNoSharedAvailability: boolean;
  allowOutsideAvailabilityTeacher: boolean;
  allowOutsideAvailabilityStudent: boolean;
  generationMonths: number;
};

export function SchedulingConflictSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/scheduling-config?scope=global`);
        const data = await res.json();
        const e = data.effective || {};
        setConfig({
          markTeacherUnavailable: !!e.markTeacherUnavailable,
          markStudentUnavailable: !!e.markStudentUnavailable,
          markTeacherWrongTime: !!e.markTeacherWrongTime,
          markStudentWrongTime: !!e.markStudentWrongTime,
          markNoSharedAvailability: !!e.markNoSharedAvailability,
          allowOutsideAvailabilityTeacher: !!e.allowOutsideAvailabilityTeacher,
          allowOutsideAvailabilityStudent: !!e.allowOutsideAvailabilityStudent,
          generationMonths: Number(e.generationMonths ?? 1),
        });
      } catch (e) {
        toast.error("設定の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/scheduling-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'global', ...config }),
      });
      if (!res.ok) throw new Error('failed');
      toast.success('保存しました');
    } catch (_) {
      toast.error('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) return <div className="text-sm text-muted-foreground">読み込み中...</div>;

  const Row = ({ id, label, checked, onChange, hint }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string; }) => (
    <div className="flex items-start justify-between py-2">
      <div>
        <Label htmlFor={id} className="font-medium">{label}</Label>
        {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-muted-foreground">ハード競合（常にCONFLICTED）</div>
        <ul className="mt-2 text-sm list-disc list-inside text-muted-foreground">
          <li>講師の重複</li>
          <li>生徒の重複</li>
          <li>ブースの重複</li>
        </ul>
      </div>

      <Separator />
      <div>
        <div className="text-sm font-medium mb-2">生成ウィンドウ（月）</div>
        <div className="space-y-1">
          <Label htmlFor="genMonths">生成期間（月）</Label>
          <input id="genMonths" type="number" min={1} className="w-full border rounded px-2 py-1 bg-background"
            value={config.generationMonths}
            onChange={(e)=> setConfig({ ...config!, generationMonths: Math.max(1, Number(e.target.value || 1)) })}
          />
          <div className="text-xs text-muted-foreground">初回生成およびADVANCEモードの先行生成に共通</div>
        </div>
      </div>

      <Separator />
      <div>
        <div className="text-sm font-medium mb-2">ソフト競合の扱い</div>
        <Row id="markTeacherUnavailable" label="講師: 利用可能時間なしをCONFLICTED扱い" checked={config.markTeacherUnavailable} onChange={(v)=> setConfig({ ...config, markTeacherUnavailable: v })} />
        <Row id="markStudentUnavailable" label="生徒: 利用可能時間なしをCONFLICTED扱い" checked={config.markStudentUnavailable} onChange={(v)=> setConfig({ ...config, markStudentUnavailable: v })} />
        <Row id="markTeacherWrongTime" label="講師: 時間帯外をCONFLICTED扱い" checked={config.markTeacherWrongTime} onChange={(v)=> setConfig({ ...config, markTeacherWrongTime: v })} />
        <Row id="markStudentWrongTime" label="生徒: 時間帯外をCONFLICTED扱い" checked={config.markStudentWrongTime} onChange={(v)=> setConfig({ ...config, markStudentWrongTime: v })} />
        <Row id="markNoSharedAvailability" label="共有可能時間なしをCONFLICTED扱い" checked={config.markNoSharedAvailability} onChange={(v)=> setConfig({ ...config, markNoSharedAvailability: v })} />
      </div>

      <Separator />
      <div>
        <div className="text-sm font-medium mb-2">利用可能時間外の許容</div>
        <Row id="allowTeacherOutside" label="講師: 利用可能時間外でも許可（警告/競合を無視）" checked={config.allowOutsideAvailabilityTeacher} onChange={(v)=> setConfig({ ...config, allowOutsideAvailabilityTeacher: v })} />
        <Row id="allowStudentOutside" label="生徒: 利用可能時間外でも許可（警告/競合を無視）" checked={config.allowOutsideAvailabilityStudent} onChange={(v)=> setConfig({ ...config, allowOutsideAvailabilityStudent: v })} />
      </div>

      <div className="pt-2">
        <Button onClick={save} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  );
}
