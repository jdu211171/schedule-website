"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  CalendarDays,
  Clock,
  Save,
  RotateCcw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface ExceptionalAvailabilityFormProps {
  studentId: string;
  selectedDate?: Date;
  onSuccess: () => void;
}

// Form schema
const formSchema = z
  .object({
    date: z.date(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    fullDay: z.boolean(),
    reason: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      // If fullDay is true, times should be empty
      if (data.fullDay) {
        return true;
      }
      // If not full day, either both times should be provided or both empty (unavailable)
      const hasStartTime = data.startTime && data.startTime.trim() !== "";
      const hasEndTime = data.endTime && data.endTime.trim() !== "";

      return (hasStartTime && hasEndTime) || (!hasStartTime && !hasEndTime);
    },
    {
      message:
        "時間を指定する場合は、開始時間と終了時間の両方を入力してください",
    }
  );

type FormData = z.infer<typeof formSchema>;

const TIME_PRESETS = [
  { label: "午前 (9:00-12:00)", start: "09:00", end: "12:00" },
  { label: "午後 (13:00-17:00)", start: "13:00", end: "17:00" },
  { label: "夕方 (17:00-21:00)", start: "17:00", end: "21:00" },
  { label: "夜間 (19:00-22:00)", start: "19:00", end: "22:00" },
  { label: "利用不可", start: "", end: "" },
];

export function ExceptionalAvailabilityForm({
  studentId,
  selectedDate,
  onSuccess,
}: ExceptionalAvailabilityFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: selectedDate || new Date(),
      startTime: "09:00",
      endTime: "17:00",
      fullDay: false,
      reason: "",
      notes: "",
    },
  });

  const watchFullDay = form.watch("fullDay");
  const watchStartTime = form.watch("startTime");
  const watchEndTime = form.watch("endTime");

  // Create availability mutation
  const createAvailabilityMutation = useMutation({
    mutationFn: async (data: {
      userId: string;
      date: string;
      startTime: string | null;
      endTime: string | null;
      fullDay: boolean;
      type: "EXCEPTION";
      reason: string | null;
      notes: string | null;
    }) => {
      return await fetcher("/api/user-availability", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      // Invalidate availability queries
      queryClient.invalidateQueries({
        queryKey: ["user-availability", studentId, "EXCEPTION"],
      });
      toast.success("例外的な利用可能時間を作成しました");
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      const errorMessage =
        error?.message || "例外的な利用可能時間の作成に失敗しました";
      toast.error(errorMessage);
    },
  });

  // Apply time preset
  function applyTimePreset(preset: { start: string; end: string }) {
    if (preset.start === "" && preset.end === "") {
      // Unavailable preset
      form.setValue("startTime", "");
      form.setValue("endTime", "");
      form.setValue("fullDay", false);
    } else {
      form.setValue("startTime", preset.start);
      form.setValue("endTime", preset.end);
      form.setValue("fullDay", false);
    }
  }

  // Handle form submission
  async function onSubmit(values: FormData) {
    const formattedData = {
      userId: studentId,
      date: values.date.toISOString().split("T")[0],
      startTime: values.fullDay ? null : values.startTime || null,
      endTime: values.fullDay ? null : values.endTime || null,
      fullDay: values.fullDay,
      type: "EXCEPTION" as const,
      reason: values.reason || null,
      notes: values.notes || null,
    };

    createAvailabilityMutation.mutate(formattedData);
  }

  // Reset form
  function handleReset() {
    form.reset({
      date: selectedDate || new Date(),
      startTime: "09:00",
      endTime: "17:00",
      fullDay: false,
      reason: "",
      notes: "",
    });
  }

  // Validate time range
  const isUnavailable = !watchStartTime && !watchEndTime && !watchFullDay;
  const hasValidTimeRange =
    watchFullDay ||
    isUnavailable ||
    (watchStartTime && watchEndTime && watchStartTime !== watchEndTime);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Date Selection */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                対象日付
              </FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={
                    field.value
                      ? new Date(field.value).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                  className="h-10"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Availability Type Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">利用可能ステータス</Label>

          {/* Full Day Option */}
          <FormField
            control={form.control}
            name="fullDay"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (checked) {
                        form.setValue("startTime", "");
                        form.setValue("endTime", "");
                      }
                    }}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-medium">
                    終日利用可能
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    チェックすると、生徒は終日利用可能になります
                  </p>
                </div>
              </FormItem>
            )}
          />

          {/* Time Selection */}
          {!watchFullDay && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">開始時間</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          value={field.value || ""}
                          className="h-10"
                          placeholder="利用不可の場合は空欄"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">終了時間</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          value={field.value || ""}
                          className="h-10"
                          placeholder="利用不可の場合は空欄"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Time Presets */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  クイック設定
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {TIME_PRESETS.map((preset, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyTimePreset(preset)}
                      className="h-8 text-xs justify-start"
                    >
                      <Clock className="h-3 w-3 mr-2" />
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Validation Alert */}
              {!hasValidTimeRange && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    有効な時間範囲を入力するか、「終日利用可能」をチェックしてください
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Status Indicator */}
        {isUnavailable && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              この日付は利用不可として設定されます
            </AlertDescription>
          </Alert>
        )}

        {/* Reason */}
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">理由</FormLabel>
              <FormControl>
                <Input
                  placeholder="例: 定期試験、休会、学校行事"
                  {...field}
                  value={field.value || ""}
                  className="h-10"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">備考</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="必要に応じて追加の詳細を入力..."
                  className="min-h-[60px] resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={createAvailabilityMutation.isPending}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            リセット
          </Button>
          <Button
            type="submit"
            disabled={
              createAvailabilityMutation.isPending || !hasValidTimeRange
            }
            className="flex-1"
          >
            {createAvailabilityMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                保存
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
