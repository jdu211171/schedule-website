// src/components/vacation/vacation-form-dialog.tsx
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SimpleDateRangePicker } from "@/components/fix-date-range-picker/simple-date-range-picker";
import {
  useVacationCreate,
  useVacationUpdate,
} from "@/hooks/useVacationMutation";

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
  const isEditing = !!vacation;

  const form = useForm<z.infer<typeof vacationFormSchema>>({
    resolver: zodResolver(vacationFormSchema),
    defaultValues: {
      name: vacation?.name || "",
      dateRange: {
        from: vacation?.startDate
          ? new Date(vacation.startDate)
          : new Date(),
        to: vacation?.endDate ? new Date(vacation.endDate) : undefined,
      },
      isRecurring: vacation?.isRecurring ?? false,
      notes: vacation?.notes ?? "",
      order: vacation?.order ?? undefined,
    },
  });

  useEffect(() => {
    if (vacation) {
      form.reset({
        name: vacation.name || "",
        dateRange: {
          from: vacation.startDate
            ? new Date(vacation.startDate)
            : new Date(),
          to: vacation.endDate ? new Date(vacation.endDate) : undefined,
        },
        isRecurring: vacation.isRecurring ?? false,
        notes: vacation.notes ?? "",
        order: vacation.order ?? undefined,
      });
    } else {
      form.reset({
        name: "",
        dateRange: {
          from: new Date(),
          to: undefined,
        },
        isRecurring: false,
        notes: "",
        order: undefined,
      });
    }
  }, [vacation, form]);

  function onSubmit(values: z.infer<typeof vacationFormSchema>) {
    // Transform the date range to individual start and end dates for the API
    const submitValues = {
      name: values.name,
      startDate: values.dateRange.from,
      endDate: values.dateRange.to || values.dateRange.from, // If no end date, use start date
      isRecurring: values.isRecurring,
      notes: values.notes ?? "", // Ensure notes is at least an empty string, not undefined
      order: values.order,
    };

    // Close the dialog immediately for better UX
    onOpenChange(false);
    form.reset();

    // Then trigger the mutation
    if (isEditing && vacation) {
      updateVacationMutation.mutate({
        vacationId: vacation.id,
        ...submitValues,
      });
    } else {
      createVacationMutation.mutate(submitValues);
    }
  }

  return (
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
              <Button type="submit">{isEditing ? "変更を保存" : "作成"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
