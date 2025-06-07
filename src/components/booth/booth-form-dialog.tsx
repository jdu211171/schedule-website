// src/components/booth/booth-form-dialog.tsx
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
import { useBoothCreate, useBoothUpdate } from "@/hooks/useBoothMutation";
import { Booth } from "@prisma/client";

// Form schema for booth creation/editing
const boothFormSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  status: z.boolean().optional().default(true),
  notes: z.string().max(255).optional().nullable(),
  order: z.coerce.number().int().min(1).optional().nullable(),
});

interface BoothFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booth?: Booth | null;
}

export function BoothFormDialog({
  open,
  onOpenChange,
  booth,
}: BoothFormDialogProps) {
  const createBoothMutation = useBoothCreate();
  const updateBoothMutation = useBoothUpdate();
  const isEditing = !!booth;

  const form = useForm<z.infer<typeof boothFormSchema>>({
    resolver: zodResolver(boothFormSchema),
    defaultValues: {
      name: booth?.name || "",
      status: booth?.status ?? true,
      notes: booth?.notes ?? "", // Use empty string when null
      order: (booth as any)?.order ?? undefined,
    },
  });

  useEffect(() => {
    if (booth) {
      form.reset({
        name: booth.name || "",
        status: booth.status ?? true,
        notes: booth.notes ?? "", // Use empty string when null
        order: (booth as any)?.order ?? undefined,
      });
    } else {
      form.reset({
        name: "",
        status: true,
        notes: "",
        order: undefined,
      });
    }
  }, [booth, form]);

  function onSubmit(values: z.infer<typeof boothFormSchema>) {
    // Ensure the notes field is explicitly included, even if empty
    const updatedValues = {
      ...values,
      notes: values.notes ?? "", // Ensure notes is at least an empty string, not undefined
    };

    // Close the dialog immediately for better UX
    onOpenChange(false);
    form.reset();

    // Then trigger the mutation
    if (isEditing && booth) {
      updateBoothMutation.mutate({
        boothId: booth.boothId,
        ...updatedValues,
      });
    } else {
      createBoothMutation.mutate(updatedValues);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          // Reset form when dialog is closed, just like in student-form-dialog
          form.reset();
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "ブースの編集" : "ブースの作成"}
          </DialogTitle>
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
                    <Input
                      placeholder="ブース名を入力してください"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>ステータス</FormLabel>
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
            <DialogFooter>
              <Button type="submit">{isEditing ? "変更を保存" : "作成"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
