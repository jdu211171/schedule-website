"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useEventCreate, useEventUpdate } from "@/hooks/useEventMutation";
import { Event } from "@prisma/client";
import { format } from "date-fns";

// Form validation schema for client-side
const formSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "入力は必須です" })
      .max(100, { message: "100文字以内で入力してください" }),
    startDate: z.string().min(1, { message: "開始日は必須です" }),
    endDate: z.string().min(1, { message: "終了日は必須です" }),
    isRecurring: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // Make sure end date is not before start date
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    {
      message: "終了日は開始日以降の日付にしてください",
      path: ["endDate"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
}

export function EventFormDialog({
  open,
  onOpenChange,
  event,
}: EventFormDialogProps) {
  const createEventMutation = useEventCreate();
  const updateEventMutation = useEventUpdate();
  const isEditing = !!event;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: event?.name || "",
      startDate: event?.startDate
        ? format(new Date(event.startDate), "yyyy-MM-dd")
        : "",
      endDate: event?.endDate
        ? format(new Date(event.endDate), "yyyy-MM-dd")
        : "",
      isRecurring: event?.isRecurring ?? false,
    },
  });

  useEffect(() => {
    if (event) {
      form.reset({
        name: event.name || "",
        startDate: format(new Date(event.startDate), "yyyy-MM-dd"),
        endDate: format(new Date(event.endDate), "yyyy-MM-dd"),
        isRecurring: event.isRecurring ?? false,
      });
    } else {
      const today = format(new Date(), "yyyy-MM-dd");
      form.reset({
        name: "",
        startDate: today,
        endDate: today,
        isRecurring: false,
      });
    }
  }, [event, form]);

  function onSubmit(values: FormValues) {
    // Close the dialog immediately for better UX
    onOpenChange(false);

    // Create proper Date objects from the string dates
    // Note: Create Date objects at midnight JST for the selected dates
    const startDate = new Date(values.startDate);
    const endDate = new Date(values.endDate);

    // Ensure the time is set to midnight in local timezone
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const payload = {
      name: values.name,
      startDate,
      endDate,
      isRecurring: values.isRecurring,
    };

    // Then trigger the mutation with Date objects
    if (isEditing && event) {
      updateEventMutation.mutate({
        id: event.id,
        ...payload,
      });
    } else {
      createEventMutation.mutate(payload);
    }

    form.reset();
  }

  return (
    <Dialog
      open={open}
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
          <DialogTitle>
            {isEditing ? "イベントの編集" : "イベントの作成"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名前</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="イベント名を入力してください"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>開始日</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>終了日</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>繰り返し</FormLabel>
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
            <DialogFooter>
              <Button type="submit">{isEditing ? "変更を保存" : "作成"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
