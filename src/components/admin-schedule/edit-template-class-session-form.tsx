// EditTemplateClassSessionForm.tsx
import React, { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
// Import the base schema and extend it with our own validations
import { UpdateTemplateClassSessionSchema as BaseTemplateSchema } from "@/schemas/class-session.schema";

// Extended schema with Japanese validation messages
const UpdateTemplateClassSessionSchema = BaseTemplateSchema.extend({
  startTime: z
    .string({
      required_error: "開始時間は必須です",
      invalid_type_error: "開始時間の形式が正しくありません",
    })
    .optional(),
  endTime: z
    .string({
      required_error: "終了時間は必須です",
      invalid_type_error: "終了時間の形式が正しくありません",
    })
    .optional(),
  notes: z
    .string({
      invalid_type_error: "備考の形式が正しくありません",
    })
    .max(255, { message: "備考は255文字以内で入力してください" })
    .optional(),
  boothId: z
    .string({
      invalid_type_error: "ブースの形式が正しくありません",
    })
    .optional(),
}).refine(
  (data) => {
    // Skip validation if either time is missing
    if (!data.startTime || !data.endTime) return true;

    // Compare times (simple string comparison works for 24h format)
    return data.startTime < data.endTime;
  },
  {
    message: "終了時間は開始時間より後である必要があります",
    path: ["endTime"], // Highlight the endTime field with this error
  }
);
import { useClassSessionUpdate } from "@/components/match/hooks/useClassSessionMutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/fetcher";
import { Booth } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormData = z.infer<typeof UpdateTemplateClassSessionSchema>;

interface EditTemplateClassSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: (FormData & { classId: string; boothId: string | null }) | null;
  onSessionUpdated: () => void;
}

interface BoothResponse {
  data: Booth[];
}

// Helper function to format time from a Date-like object or ISO string to 24h format
const formatSessionTimeFor24Hour = (timeValue: any): string => {
  if (!timeValue) return "";

  let hours: number, minutes: number;

  if (typeof timeValue === "string") {
    if (timeValue.includes("T")) {
      // Handle ISO date string
      const d = new Date(timeValue);
      if (isNaN(d.getTime())) return "";
      hours = d.getHours();
      minutes = d.getMinutes();
    } else {
      // Handle HH:MM format
      const parts = timeValue.split(":");
      if (parts.length < 2) return "";
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return "";
    }
  } else if (timeValue instanceof Date) {
    if (isNaN(timeValue.getTime())) return "";
    hours = timeValue.getHours();
    minutes = timeValue.getMinutes();
  } else {
    return "";
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
};

export const EditTemplateClassSessionForm: React.FC<
  EditTemplateClassSessionFormProps
> = ({ open, onOpenChange, session, onSessionUpdated }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Ensure classId is not undefined
  const classId = session?.classId || "";

  // Fixed hook call with explicit type
  const {
    mutateAsync: updateClassSessionMutateAsync,
    isSuccess,
    isError,
    error,
  } = useClassSessionUpdate<true>(classId, true);

  const {
    data: boothsData,
    isLoading: isBoothsLoading,
    isError: isBoothsError,
  } = useQuery<BoothResponse>({
    queryKey: ["booths"],
    queryFn: async () => {
      try {
        // Update to use the correct booth endpoint as per schema.prisma
        const response = await fetcher<BoothResponse>("/api/booth");
        console.log("Booth data response:", response);
        return response;
      } catch (err) {
        console.error("Error fetching booths:", err);
        throw err;
      }
    },
    staleTime: Infinity,
  });

  const booths = boothsData?.data || [];

  const defaultBoothId = session?.boothId || "";

  const form = useForm<FormData>({
    resolver: zodResolver(UpdateTemplateClassSessionSchema),
    defaultValues: {
      classId: session?.classId || "",
      startTime: formatSessionTimeFor24Hour(session?.startTime),
      endTime: formatSessionTimeFor24Hour(session?.endTime),
      boothId: defaultBoothId,
      notes: session?.notes || "",
    },
    mode: "onChange", // Change to onChange for more responsive validation
  });

  const { register, setValue, watch, getValues, reset } = form; // Add reset here
  const selectedBoothId = watch("boothId");
  const startTime = watch("startTime");
  const endTime = watch("endTime");

  useEffect(() => {
    if (isSuccess) {
      setSuccessMsg("セッションが正常に更新されました");
      setTimeout(() => {
        onSessionUpdated();
        onOpenChange(false);
      }, 1000);
    }
  }, [isSuccess, onSessionUpdated, onOpenChange]);

  // Add this useEffect to update form values when the session prop changes
  useEffect(() => {
    if (session) {
      reset({
        classId: session.classId || "",
        startTime: formatSessionTimeFor24Hour(session.startTime),
        endTime: formatSessionTimeFor24Hour(session.endTime),
        boothId: session.boothId || "", // Ensure consistency with how defaultBoothId was derived
        notes: session.notes || "",
      });
    } else {
      // Optionally, reset to initial empty state if session becomes null
      reset({
        classId: "",
        startTime: "",
        endTime: "",
        boothId: "",
        notes: "",
      });
    }
  }, [session, reset]); // Dependencies: session and reset

  // Generate time options for dropdown in 24-hour format
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Save handler
  const handleSaveClick = async () => {
    if (!session?.classId) {
      setApiError("エラー: セッションIDが見つかりません");
      return;
    }

    // Validate form before submission
    const isValid = await form.trigger();
    if (!isValid) {
      // Form has validation errors, don't proceed
      console.log("フォームバリデーションエラー:", form.formState.errors);
      return;
    }

    // Manual validation for time relationship
    const formData = getValues();
    if (
      formData.startTime &&
      formData.endTime &&
      formData.startTime >= formData.endTime
    ) {
      form.setError("endTime", {
        type: "validate",
        message: "終了時間は開始時間より後である必要があります",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setApiError(null);
      setSuccessMsg(null);

      // Time is already in 24-hour format, no conversion needed
      const startTime24 = formData.startTime;
      const endTime24 = formData.endTime;

      // Send the time as is to align with backend expectations
      await updateClassSessionMutateAsync({
        classId: session.classId,
        startTime: startTime24,
        endTime: endTime24,
        boothId: formData.boothId || undefined,
        notes: formData.notes,
      });
    } catch (err) {
      console.error("Error updating session:", err);
      let errorMessage = "セッションの更新中にエラーが発生しました";

      if (err && typeof err === "object" && "message" in err) {
        const errMsg = (err as Record<string, unknown>).message as string;

        // Translate common error messages
        if (errMsg.includes("There is a scheduling conflict")) {
          errorMessage = "予定が重複しています。他の時間帯を選択してください。";
        } else if (errMsg.includes("Booth is already booked")) {
          errorMessage = "指定した時間にブースが既に予約されています。";
        } else if (errMsg.includes("Invalid subject-subject type")) {
          errorMessage = "科目と科目タイプの組み合わせが無効です。";
        } else if (errMsg.includes("End time must be after start time")) {
          errorMessage = "終了時間は開始時間より後である必要があります。";
        } else {
          // Use the original message if no specific translation
          errorMessage = errMsg;
        }
      }

      setApiError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>テンプレート授業の編集</AlertDialogTitle>
          <AlertDialogDescription>
            時間、ブース、または備考を変更し、「保存」をクリックしてください。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="startTime">
              開始時間 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={startTime}
              onValueChange={(value) => setValue("startTime", value)}
            >
              <SelectTrigger
                className={`w-full ${
                  form.formState.errors.startTime ? "border-red-500" : ""
                }`}
              >
                <SelectValue placeholder="開始時間を選択" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.startTime && (
              <p className="text-sm text-red-500 mt-1">
                {String(form.formState.errors.startTime.message)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="endTime">
              終了時間 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={endTime}
              onValueChange={(value) => setValue("endTime", value)}
            >
              <SelectTrigger
                className={`w-full ${
                  form.formState.errors.endTime ? "border-red-500" : ""
                }`}
              >
                <SelectValue placeholder="終了時間を選択" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.endTime && (
              <p className="text-sm text-red-500 mt-1">
                {String(form.formState.errors.endTime.message)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="boothId">ブース</Label>
            <Select
              value={selectedBoothId || "none"}
              onValueChange={(value) =>
                setValue("boothId", value === "none" ? undefined : value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ブースを選択" />
              </SelectTrigger>
              <SelectContent>
                {isBoothsLoading ? (
                  <SelectItem value="loading">ブースを読み込み中...</SelectItem>
                ) : isBoothsError ? (
                  <SelectItem value="error">ブースの読み込みエラー</SelectItem>
                ) : booths.length > 0 ? (
                  <>
                    <SelectItem value="none">-</SelectItem>
                    {booths.map((booth) => (
                      <SelectItem key={booth.boothId} value={booth.boothId}>
                        {booth.name}
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <SelectItem value="empty">
                    利用可能なブースがありません
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.boothId && (
              <p className="text-sm text-red-500">
                {String(form.formState.errors.boothId.message)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">備考</Label>
            <Input
              id="notes"
              {...register("notes")}
              // Remove any explicit value or onChange, let register handle both
            />
            {form.formState.errors.notes && (
              <p className="text-sm text-red-500">
                {String(form.formState.errors.notes.message)}
              </p>
            )}
          </div>

          {/* Success messages */}
          {successMsg && (
            <div className="p-3 rounded bg-green-50 border border-green-200 text-green-600 text-sm">
              {successMsg}
            </div>
          )}

          {/* API Errors */}
          {apiError && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
              {apiError}
            </div>
          )}

          {isError && error && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
              {typeof error === "object" && "message" in error
                ? (() => {
                    const errMsg = String(error.message);
                    if (errMsg.includes("There is a scheduling conflict")) {
                      return "予定が重複しています。他の時間帯を選択してください。";
                    } else if (errMsg.includes("Booth is already booked")) {
                      return "指定した時間にブースが既に予約されています。";
                    } else if (
                      errMsg.includes("End time must be after start time")
                    ) {
                      return "終了時間は開始時間より後である必要があります。";
                    } else {
                      return errMsg;
                    }
                  })()
                : "エラーが発生しました"}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel type="button">キャンセル</AlertDialogCancel>
            <Button
              onClick={handleSaveClick}
              disabled={isSubmitting || isBoothsLoading}
              type="button"
            >
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
