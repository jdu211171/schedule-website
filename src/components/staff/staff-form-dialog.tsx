// src/components/staff/staff-form-dialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";

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
import { useStaffCreate, useStaffUpdate } from "@/hooks/useStaffMutation";
import { Staff } from "@/hooks/useStaffQuery";
import { MultiSelect } from "@/components/multi-select";
import { useBranches } from "@/hooks/useBranchQuery";

// Form schema for staff creation/editing
const staffFormSchema = z.object({
  username: z.string().min(1, "ユーザー名は必須です"),
  password: z.string().optional(),
  email: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .optional()
    .nullable(),
  name: z.string().optional().nullable(),
  branchIds: z.array(z.string()).optional().default([]),
});

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: Staff | null;
}

export function StaffFormDialog({
  open,
  onOpenChange,
  staff,
}: StaffFormDialogProps) {
  const createStaffMutation = useStaffCreate();
  const updateStaffMutation = useStaffUpdate();
  const isEditing = !!staff;

  // Fetch branches for selection
  const { data: branchesData } = useBranches({ limit: 100 });
  const branches = branchesData?.data || [];

  const branchOptions = branches.map((branch) => ({
    value: branch.branchId,
    label: branch.name,
  }));

  // Get the current branch ID from localStorage
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);

  // Initialize current branch ID from localStorage
  useEffect(() => {
    const storedBranchId = localStorage.getItem("selectedBranchId");
    setCurrentBranchId(storedBranchId);
  }, []);

  const form = useForm<z.infer<typeof staffFormSchema>>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      username: staff?.username || "",
      password: "", // Don't pre-fill password for security
      email: staff?.email || "",
      name: staff?.name || "",
      branchIds: staff?.branches?.map((b) => b.branchId) || [],
    },
  });

  useEffect(() => {
    if (staff) {
      // Editing existing staff - use their existing branch assignments
      form.reset({
        username: staff.username || "",
        password: "", // Don't pre-fill password
        email: staff.email || null,
        name: staff.name || null,
        branchIds: staff.branches?.map((b) => b.branchId) || [],
      });
    } else {
      // Creating new staff - default to current branch if available
      form.reset({
        username: "",
        password: "",
        email: null,
        name: null,
        branchIds: currentBranchId ? [currentBranchId] : [],
      });
    }
  }, [staff, form, currentBranchId]);

  function onSubmit(values: z.infer<typeof staffFormSchema>) {
    // Make a copy of the values to modify
    const formData = { ...values };

    // For editing staff, remove empty password
    if (isEditing && (!formData.password || formData.password.trim() === "")) {
      delete formData.password;
    }

    // For new staff, ensure a password is provided
    if (!isEditing && (!formData.password || formData.password.trim() === "")) {
      // Show error and return
      form.setError("password", {
        type: "manual",
        message: "パスワードは必須です",
      });
      return;
    }

    // Ensure branchIds is always an array
    formData.branchIds = formData.branchIds || [];

    // Ensure the current branch is included for new staff when available
    if (
      !isEditing &&
      currentBranchId &&
      !formData.branchIds.includes(currentBranchId)
    ) {
      formData.branchIds = [...formData.branchIds, currentBranchId];
    }

    // Close the dialog immediately for better UX - but only if validation passes
    onOpenChange(false);
    form.reset();

    // Then trigger the mutation
    if (isEditing && staff) {
      updateStaffMutation.mutate({
        id: staff.id,
        ...formData,
      });
    } else {
      createStaffMutation.mutate({
        ...formData,
        password: formData.password ?? "",
      });
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "スタッフの編集" : "スタッフの作成"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                    ユーザー名
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ユーザー名を入力してください"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel
                    className={
                      isEditing
                        ? ""
                        : "after:content-['*'] after:ml-1 after:text-destructive"
                    }
                  >
                    パスワード{isEditing && "（変更する場合のみ入力）"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={
                        isEditing
                          ? "パスワードを変更する場合は入力"
                          : "パスワードを入力してください"
                      }
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名前</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="名前を入力してください"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="メールアドレスを入力してください"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="branchIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>支店</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={branchOptions}
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder="支店を選択してください"
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
