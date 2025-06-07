// src/components/subject-type/subject-type-form-dialog.tsx
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
import {
  useSubjectTypeCreate,
  useSubjectTypeUpdate,
} from "@/hooks/useSubjectTypeMutation";
import { SubjectType } from "@/hooks/useSubjectTypeQuery";

// Form schema for subject type creation/editing
const subjectTypeFormSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  notes: z.string().max(255).optional().nullable(),
  order: z.coerce.number().int().min(1).optional().nullable(),
});

interface SubjectTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectType?: SubjectType | null;
}

export function SubjectTypeFormDialog({
  open,
  onOpenChange,
  subjectType,
}: SubjectTypeFormDialogProps) {
  const createSubjectTypeMutation = useSubjectTypeCreate();
  const updateSubjectTypeMutation = useSubjectTypeUpdate();
  const isEditing = !!subjectType;

  const form = useForm<z.infer<typeof subjectTypeFormSchema>>({
    resolver: zodResolver(subjectTypeFormSchema),
    defaultValues: {
      name: subjectType?.name || "",
      notes: subjectType?.notes ?? "",
      order: subjectType?.order ?? undefined,
    },
  });

  useEffect(() => {
    if (subjectType) {
      form.reset({
        name: subjectType.name || "",
        notes: subjectType.notes ?? "",
        order: subjectType.order ?? undefined,
      });
    } else {
      form.reset({
        name: "",
        notes: "",
        order: undefined,
      });
    }
  }, [subjectType, form]);

  function onSubmit(values: z.infer<typeof subjectTypeFormSchema>) {
    // Ensure the notes field is explicitly included, even if empty
    const updatedValues = {
      ...values,
      notes: values.notes ?? "", // Ensure notes is at least an empty string, not undefined
    };

    // Close the dialog immediately for better UX
    onOpenChange(false);
    form.reset();

    // Then trigger the mutation
    if (isEditing && subjectType) {
      updateSubjectTypeMutation.mutate({
        subjectTypeId: subjectType.subjectTypeId,
        ...updatedValues,
      });
    } else {
      createSubjectTypeMutation.mutate(updatedValues);
    }
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
            {isEditing ? "科目タイプの編集" : "科目タイプの作成"}
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
                      placeholder="科目タイプ名を入力してください"
                      {...field}
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
