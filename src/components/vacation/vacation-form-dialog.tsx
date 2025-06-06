// src/components/vacation/vacation-form-dialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect } from "react";
import { format } from "date-fns";

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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
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
    startDate: z.date({
      required_error: "開始日は必須です",
    }),
    endDate: z.date({
      required_error: "終了日は必須です",
    }),
    isRecurring: z.boolean().default(false),
    notes: z.string().max(255).optional().nullable(),
    order: z.coerce.number().int().min(1).optional().nullable(),
  })
  .refine(
    (data) => {
      // Ensure end date is after or equal to start date
      return data.endDate >= data.startDate;
    },
    {
      message: "終了日は開始日以降でなければなりません",
      path: ["endDate"],
    }
  );

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
      startDate: vacation?.startDate
        ? new Date(vacation.startDate)
        : new Date(),
      endDate: vacation?.endDate ? new Date(vacation.endDate) : new Date(),
      isRecurring: vacation?.isRecurring ?? false,
      notes: vacation?.notes ?? "",
      order: vacation?.order ?? undefined,
    },
  });

  useEffect(() => {
    if (vacation) {
      form.reset({
        name: vacation.name || "",
        startDate: vacation.startDate
          ? new Date(vacation.startDate)
          : new Date(),
        endDate: vacation.endDate ? new Date(vacation.endDate) : new Date(),
        isRecurring: vacation.isRecurring ?? false,
        notes: vacation.notes ?? "",
        order: vacation.order ?? undefined,
      });
    } else {
      form.reset({
        name: "",
        startDate: new Date(),
        endDate: new Date(),
        isRecurring: false,
        notes: "",
        order: undefined,
      });
    }
  }, [vacation, form]);

  function onSubmit(values: z.infer<typeof vacationFormSchema>) {
    // Ensure the notes field is explicitly included, even if empty
    const updatedValues = {
      ...values,
      notes: values.notes ?? "", // Ensure notes is at least an empty string, not undefined
    };

    // Close the dialog immediately for better UX
    onOpenChange(false);
    form.reset();

    // Then trigger the mutation
    if (isEditing && vacation) {
      updateVacationMutation.mutate({
        vacationId: vacation.id,
        ...updatedValues,
      });
    } else {
      createVacationMutation.mutate(updatedValues);
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

            <div className="grid grid-cols-2 gap-4">
              {/* Start Date Picker */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                      開始日
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "yyyy/MM/dd")
                            ) : (
                              <span>日付を選択</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0"
                        align="start"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date Picker */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                      終了日
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "yyyy/MM/dd")
                            ) : (
                              <span>日付を選択</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0"
                        align="start"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
