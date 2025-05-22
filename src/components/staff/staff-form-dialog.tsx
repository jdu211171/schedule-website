"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStaffCreate, useStaffUpdate } from "@/hooks/useStaffMutation";
import {
  staffCreateSchema,
  staffUpdateSchema,
  staffFormSchema, // Import the new unified schema
  type StaffFormValues, // Import the new unified form type
} from "@/schemas/staff.schema";
import { Staff } from "@/hooks/useStaffQuery";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();

  // Get branches from session instead of fetching
  const branchesResponse = session?.user?.branches
    ? { data: session.user.branches }
    : { data: [] };
  const isBranchesLoading = !session?.user?.branches;

  const isEditing = !!staff;

  // Use the schemas directly from staff.schema.ts without modification
  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema), // Use the unified schema
    defaultValues: {
      name: "",
      username: "",
      password: "", // Password can be empty initially
      email: "",
      branchIds: [],
      id: undefined, // id is optional; only populated in edit mode.
    },
  });

  const defaultBranchId = session?.user?.branches?.[0]?.branchId;

  useEffect(() => {
    if (staff && isEditing) {
      const branchIds = staff.branches?.map((branch) => branch.branchId) || [];
      // Ensure defaultBranchId is always included
      const branchIdsWithDefault =
        defaultBranchId && !branchIds.includes(defaultBranchId)
          ? [defaultBranchId, ...branchIds]
          : branchIds;
      form.reset({
        id: staff.id,
        name: staff.name || "",
        username: staff.username || "",
        email: staff.email || "",
        password: "",
        branchIds: branchIdsWithDefault,
      });
    } else {
      // Reset form when creating a new staff or when staff is null
      form.reset({
        name: "",
        username: "",
        password: "",
        email: "",
        branchIds: defaultBranchId ? [defaultBranchId] : [],
        id: undefined,
      });
    }
  }, [staff, form, isEditing, defaultBranchId]);

  function onSubmit(values: StaffFormValues) {
    // Create a modified submission object
    const submissionData = { ...values };

    if (isEditing) {
      // If password is empty in edit mode, remove it from the submission
      if (!submissionData.password || submissionData.password === "") {
        delete submissionData.password;
      }
      // Ensure id is present for update
      if (!submissionData.id) {
        console.error("ID is missing for update operation");
        // Optionally, show an error to the user
        return; // Early return if ID is missing for an update
      }
      const updatePayload = staffUpdateSchema.parse(submissionData);
      updateStaffMutation.mutate(updatePayload, {
        onSuccess: () => {
          onOpenChange(false); // Close dialog on success
          form.reset(); // Reset form on success
        },
      });
    } else {
      // For creation, remove the id field if it exists (it shouldn't based on logic but good practice)
      const { id, ...createValues } = submissionData;
      // Ensure password is provided for creation, as staffCreateSchema requires it.
      // The form schema allows it to be optional, so we must validate here or rely on staffCreateSchema.parse
      if (!createValues.password) {
        // This scenario should ideally be caught by form validation if password was made mandatory in staffFormSchema for create mode
        // For now, we rely on staffCreateSchema.parse to throw an error if password is not there.
        // Or, you could set a form error here: form.setError("password", { type: "manual", message: "Password is required for new staff." });
        // return;
      }
      const createPayload = staffCreateSchema.parse(createValues);
      createStaffMutation.mutate(createPayload, {
        onSuccess: () => {
          onOpenChange(false); // Close dialog on success
          form.reset(); // Reset form on success
        },
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                    名前
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="名前を入力してください" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    パスワード{isEditing ? "（変更する場合のみ）" : ""}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={
                        isEditing
                          ? "パスワードを変更する場合のみ入力"
                          : "パスワードを入力してください"
                      }
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
                  <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                    メールアドレス
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="メールアドレスを入力してください"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="branchIds"
              render={() => (
                <FormItem>
                  <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                    支店（複数選択可）
                  </FormLabel>
                  <Card>
                    <CardContent className="pt-4">
                      <ScrollArea className="h-56 pr-4">
                        {isBranchesLoading ? (
                          <div>読み込み中...</div>
                        ) : (
                          <div className="space-y-2">
                            {branchesResponse?.data.map((branch) => (
                              <FormField
                                key={branch.branchId}
                                control={form.control}
                                name="branchIds"
                                render={({ field }) => {
                                  const isDefault = branch.branchId === defaultBranchId;
                                  return (
                                    <FormItem
                                      key={branch.branchId}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(branch.branchId)}
                                          disabled={isDefault}
                                          onCheckedChange={(checked) => {
                                            let currentValues = [...(field.value || [])];
                                            if (isDefault) {
                                              // Always keep default branch in the value
                                              if (!currentValues.includes(branch.branchId)) {
                                                currentValues = [branch.branchId, ...currentValues];
                                              }
                                              field.onChange(currentValues);
                                              return;
                                            }
                                            if (checked) {
                                              if (!currentValues.includes(branch.branchId)) {
                                                field.onChange([...currentValues, branch.branchId]);
                                              }
                                            } else {
                                              field.onChange(currentValues.filter((value) => value !== branch.branchId));
                                            }
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal cursor-pointer">
                                        {branch.name}
                                        {isDefault && <span className="ml-2 text-xs text-muted-foreground">(デフォルト)</span>}
                                      </FormLabel>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isBranchesLoading}>
                {isEditing ? "変更を保存" : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
