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
import { UpdateTemplateClassSessionSchema } from "@/schemas/class-session.schema";
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

// Helper function to convert 24h format to 12h AM/PM format
function formatTo12Hour(time24: string): string {
  if (!time24) return "";

  const [hour, minute] = time24.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM

  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
}

// Helper function to convert 12h AM/PM format to 24h format
function formatTo24Hour(time12: string): string {
  if (!time12) return "";

  const [timePart, period] = time12.split(" ");
  const [hour, minute] = timePart.split(":").map(Number);

  let hour24 = hour;
  if (period === "PM" && hour !== 12) hour24 += 12;
  if (period === "AM" && hour === 12) hour24 = 0;

  return `${hour24.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
}

export const EditTemplateClassSessionForm: React.FC<
  EditTemplateClassSessionFormProps
> = ({ open, onOpenChange, session, onSessionUpdated }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Убедимся, что classId не undefined
  const classId = session?.classId || "";

  // Исправленный вызов хука с явным указанием типа
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

  // Format the time from ISO to 12h AM/PM format for display
  const formatTimeFromISOTo12Hour = (isoTime: string | undefined): string => {
    if (!isoTime) return "";
    const timePart = isoTime.split("T")[1]?.substring(0, 5) || "";
    return formatTo12Hour(timePart);
  };

  const form = useForm<FormData>({
    resolver: zodResolver(UpdateTemplateClassSessionSchema),
    defaultValues: {
      classId: session?.classId || "",
      startTime: formatTimeFromISOTo12Hour(session?.startTime),
      endTime: formatTimeFromISOTo12Hour(session?.endTime),
      boothId: defaultBoothId,
      notes: session?.notes || "",
    },
  });

  const { register, setValue, watch, getValues } = form;
  const selectedBoothId = watch("boothId");
  const startTime = watch("startTime");
  const endTime = watch("endTime");

  useEffect(() => {
    if (isSuccess) {
      setSuccessMsg("Занятие успешно обновлено");
      setTimeout(() => {
        onSessionUpdated();
        onOpenChange(false);
      }, 1000);
    }
  }, [isSuccess, onSessionUpdated, onOpenChange]);

  // Generate time options for dropdown
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const hour12 = hour % 12 || 12;
        const period = hour >= 12 ? "PM" : "AM";
        const timeString = `${hour12}:${minute
          .toString()
          .padStart(2, "0")} ${period}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Обработчик сохранения
  const handleSaveClick = async () => {
    if (!session?.classId) {
      setApiError("Ошибка: Отсутствует идентификатор занятия");
      return;
    }

    try {
      setIsSubmitting(true);
      setApiError(null);
      setSuccessMsg(null);

      const formData = getValues();

      // Convert time from 12h AM/PM format to 24h format before sending to server
      const startTime24 = formData.startTime
        ? formatTo24Hour(formData.startTime)
        : null;
      const endTime24 = formData.endTime
        ? formatTo24Hour(formData.endTime)
        : null;

      // Консоль для отладки
      console.log("Отправляемые данные:", {
        classId: session.classId,
        startTime: startTime24,
        endTime: endTime24,
        boothId: formData.boothId,
        notes: formData.notes,
      });

      // Явно указываем classId в отправляемых данных
      await updateClassSessionMutateAsync({
        classId: session.classId,
        startTime: startTime24,
        endTime: endTime24,
        boothId: formData.boothId,
        notes: formData.notes,
      });
    } catch (err: any) {
      console.error("Ошибка при обновлении:", err);
      let errorMessage = "Ошибка при обновлении занятия";

      if (err?.message) {
        errorMessage += `: ${err.message}`;
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
          <AlertDialogTitle>Редактировать занятие (шаблон)</AlertDialogTitle>
          <AlertDialogDescription>
            Измените время, будку или примечания и нажмите "Сохранить".
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="startTime">Время начала</Label>
            <Select
              value={startTime}
              onValueChange={(value) => setValue("startTime", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите время начала" />
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
              <p className="text-sm text-red-500">
                {String(form.formState.errors.startTime.message)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="endTime">Время окончания</Label>
            <Select
              value={endTime}
              onValueChange={(value) => setValue("endTime", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите время окончания" />
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
              <p className="text-sm text-red-500">
                {String(form.formState.errors.endTime.message)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="boothId">Будка</Label>
            <Select
              value={selectedBoothId || "none"}
              onValueChange={(value) =>
                setValue("boothId", value === "none" ? null : value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите будку" />
              </SelectTrigger>
              <SelectContent>
                {isBoothsLoading ? (
                  <SelectItem value="loading">Загрузка будок...</SelectItem>
                ) : isBoothsError ? (
                  <SelectItem value="error">Ошибка загрузки будок</SelectItem>
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
                  <SelectItem value="empty">Нет доступных будок</SelectItem>
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
            <Label htmlFor="notes">Примечания</Label>
            <Input id="notes" {...register("notes")} />
            {form.formState.errors.notes && (
              <p className="text-sm text-red-500">
                {String(form.formState.errors.notes.message)}
              </p>
            )}
          </div>

          {/* Сообщения об успехе */}
          {successMsg && (
            <div className="p-3 rounded bg-green-50 border border-green-200 text-green-600 text-sm">
              {successMsg}
            </div>
          )}

          {/* Ошибки API */}
          {apiError && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
              {apiError}
            </div>
          )}

          {isError && error && (
            <p className="text-sm text-red-500">
              {typeof error === "object" && "message" in error
                ? String(error.message)
                : "Произошла ошибка"}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Отмена</AlertDialogCancel>
            <Button
              onClick={handleSaveClick}
              disabled={isSubmitting || isBoothsLoading}
              type="button"
            >
              {isSubmitting ? "Сохранение..." : "Сохранить"}
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
