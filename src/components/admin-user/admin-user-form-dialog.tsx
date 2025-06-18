"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Loader2, X } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SearchableMultiSelect } from "@/components/admin-schedule/searchable-multi-select";
import { useCreateAdminUser, useUpdateAdminUser } from "@/hooks/useAdminUserMutation";
import {
  adminUserFormSchema,
  adminUserCreateSchema,
  adminUserUpdateSchema,
  type AdminUserFormInput,
} from "@/schemas/adminUser.schema";
import type { AdminUser } from "@/hooks/useAdminUserQuery";
import { useAllBranchesOrdered } from "@/hooks/useBranchQuery";

interface AdminUserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminUser?: AdminUser | null;
}

export function AdminUserFormDialog({
  open,
  onOpenChange,
  adminUser,
}: AdminUserFormDialogProps) {
  const createAdminUserMutation = useCreateAdminUser();
  const updateAdminUserMutation = useUpdateAdminUser();

  const { data: branches = [], isLoading: isBranchesLoading } = useAllBranchesOrdered();

  const isEditing = !!adminUser;
  const isSubmitting =
    createAdminUserMutation.isPending || updateAdminUserMutation.isPending;

  const form = useForm<AdminUserFormInput>({
    resolver: zodResolver(adminUserFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      branchIds: [],
      isRestrictedAdmin: false,
      id: undefined,
    },
  });

  useEffect(() => {
    if (adminUser && isEditing) {
      const branchIds = adminUser.branches?.map((branch) => branch.branchId) || [];
      form.reset({
        id: adminUser.id,
        name: adminUser.name || "",
        email: adminUser.email || "",
        username: adminUser.username || "",
        password: "",
        branchIds: branchIds,
        isRestrictedAdmin: adminUser.isRestrictedAdmin || false,
      });
    } else {
      form.reset({
        name: "",
        email: "",
        username: "",
        password: "",
        branchIds: [],
        isRestrictedAdmin: false,
        id: undefined,
      });
    }
  }, [adminUser, form, isEditing]);

  function onSubmit(values: AdminUserFormInput) {
    const submissionData = { ...values };

    if (isEditing) {
      // If password is empty in edit mode, remove it from the submission
      if (!submissionData.password || submissionData.password === "") {
        delete submissionData.password;
      }
      // Ensure id is present for update
      if (!submissionData.id) {
        console.error("ID is missing for update operation");
        return;
      }
      const updatePayload = adminUserUpdateSchema.parse(submissionData);
      updateAdminUserMutation.mutate(updatePayload, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    } else {
      // For creation, remove the id field if it exists
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...createValues } = submissionData;
      const createPayload = adminUserCreateSchema.parse(createValues);
      createAdminUserMutation.mutate(createPayload, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? "管理者情報の編集" : "新しい管理者の作成"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    基本情報
                  </h3>
                  <Separator className="flex-1" />
                </div>

                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium after:content-['*'] after:ml-1 after:text-destructive">
                        名前
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="管理者名"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium after:content-['*'] after:ml-1 after:text-destructive">
                        メールアドレス
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@example.com"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Account Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    アカウント情報
                  </h3>
                  <Separator className="flex-1" />
                </div>

                {/* Username */}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium after:content-['*'] after:ml-1 after:text-destructive">
                        ユーザー名
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="admin_username"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className={`text-sm font-medium ${
                          isEditing
                            ? ""
                            : "after:content-['*'] after:ml-1 after:text-destructive"
                        }`}
                      >
                        パスワード{isEditing ? "（変更する場合のみ）" : ""}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={
                            isEditing
                              ? "新しいパスワードを入力"
                              : "パスワードを入力"
                          }
                          className="h-11"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Branch Assignment Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    校舎割り当て
                  </h3>
                  <Separator className="flex-1" />
                </div>

                {/* Restricted Admin Checkbox */}
                <FormField
                  control={form.control}
                  name="isRestrictedAdmin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium">
                          制限付き管理者
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          この管理者は他の管理者の閲覧・作成・編集・削除ができません
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Branches */}
                <FormField
                  control={form.control}
                  name="branchIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium after:content-['*'] after:ml-1 after:text-destructive">
                        所属校舎
                      </FormLabel>
                      <FormControl>
                        <div className="mb-6">
                          <SearchableMultiSelect
                            value={field.value || []}
                            onValueChange={field.onChange}
                            items={branches.map((branch) => ({
                              value: branch.branchId,
                              label: branch.name,
                            }))}
                            placeholder="校舎を選択してください"
                            searchPlaceholder="校舎名を検索..."
                            emptyMessage="該当する校舎が見つかりません"
                            loading={isBranchesLoading}
                            disabled={isBranchesLoading}
                            renderSelectedBadge={(item, isDefault, onRemove) => (
                              <Badge
                                key={item.value}
                                variant={isDefault ? "default" : "secondary"}
                                className="flex items-center gap-1 px-3 py-1"
                              >
                                <span>{item.label}</span>
                                {!isDefault && onRemove && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 ml-1 hover:bg-muted rounded-full"
                                    onClick={onRemove}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </Badge>
                            )}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "更新" : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
