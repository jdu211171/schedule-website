"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react"; // Added useState

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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useBoothCreate, useBoothUpdate } from "@/hooks/useBoothMutation";
import { CreateBoothSchema } from "@/schemas/booth.schema";
import { Booth } from "@prisma/client";

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
  const [localSubmitting, setLocalSubmitting] = useState(false); // Added local state
  const isSubmitting =
    localSubmitting || createBoothMutation.isPending || updateBoothMutation.isPending;
  const isEditing = !!booth;

  const formSchema = CreateBoothSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: booth?.name || "",
      status: booth?.status ?? true,
      notes: booth?.notes ?? "", // Use empty string when null
    },
  });

  useEffect(() => {
    if (booth) {
      form.reset({
        name: booth.name || "",
        status: booth.status ?? true,
        notes: booth.notes ?? "", // Use empty string when null
      });
    } else {
      form.reset({
        name: "",
        status: true,
        notes: "",
      });
    }
  }, [booth, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Immediately set submitting to true to prevent multiple clicks
    setLocalSubmitting(true);

    try {
      // Ensure the notes field is explicitly included, even if empty
      const updatedValues = {
        ...values,
        notes: values.notes ?? "", // Ensure notes is at least an empty string, not undefined
      };

      if (isEditing && booth) {
        await updateBoothMutation.mutateAsync({
          boothId: booth.boothId,
          ...updatedValues,
        });
      } else {
        await createBoothMutation.mutateAsync(updatedValues);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("ブースの保存に失敗しました:", error);
    } finally {
      // Ensure we reset the submitting state even if there's an error
      setLocalSubmitting(false);
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
                  <FormLabel>名前</FormLabel>
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
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "保存中..." : isEditing ? "変更を保存" : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
