// src/components/branch/branch-form-dialog.tsx
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
import { Textarea } from "@/components/ui/textarea";
import { useBranchCreate, useBranchUpdate } from "@/hooks/useBranchMutation";
import { Branch } from "@/hooks/useBranchQuery";

// Form schema for branch creation/editing
const branchFormSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  notes: z.string().max(255).optional().nullable(),
});

interface BranchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch | null;
}

export function BranchFormDialog({
  open,
  onOpenChange,
  branch,
}: BranchFormDialogProps) {
  const createBranchMutation = useBranchCreate();
  const updateBranchMutation = useBranchUpdate();
  const isEditing = !!branch;

  const form = useForm<z.infer<typeof branchFormSchema>>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name: branch?.name || "",
      notes: branch?.notes ?? "", // Use empty string when null
    },
  });

  useEffect(() => {
    if (branch) {
      form.reset({
        name: branch.name || "",
        notes: branch.notes ?? "", // Use empty string when null
      });
    } else {
      form.reset({
        name: "",
        notes: "",
      });
    }
  }, [branch, form]);

  function onSubmit(values: z.infer<typeof branchFormSchema>) {
    // Ensure the notes field is explicitly included, even if empty
    const updatedValues = {
      ...values,
      notes: values.notes ?? "", // Ensure notes is at least an empty string, not undefined
    };

    // Close the dialog immediately for better UX
    onOpenChange(false);
    form.reset();

    // Then trigger the mutation
    if (isEditing && branch) {
      updateBranchMutation.mutate({
        branchId: branch.branchId,
        ...updatedValues,
      });
    } else {
      createBranchMutation.mutate(updatedValues);
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
          <DialogTitle>{isEditing ? "校舎の編集" : "校舎の作成"}</DialogTitle>
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
                    <Input placeholder="校舎名を入力してください" {...field} />
                  </FormControl>
                  <FormMessage />
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
              <Button type="submit">{isEditing ? "変更を保存" : "作成"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
