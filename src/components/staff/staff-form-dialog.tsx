"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SearchableMultiSelect } from "@/components/admin-schedule/searchable-multi-select";
import { useStaffCreate, useStaffUpdate } from "@/hooks/useStaffMutation";
import {
  staffCreateSchema,
  staffUpdateSchema,
  staffFormSchema,
  type StaffFormValues,
} from "@/schemas/staff.schema";
import type { Staff } from "@/hooks/useStaffQuery";
import { useAllBranchesOrdered } from "@/hooks/useBranchQuery";

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

  // Use ordered branches from API
  const { data: branches = [], isLoading: isBranchesLoading } = useAllBranchesOrdered();

  // Use the selected branch from session instead of first branch
  const defaultBranchId = session?.user?.selectedBranchId || branches?.[0]?.branchId;

  const isEditing = !!staff;
  const isSubmitting =
    createStaffMutation.isPending || updateStaffMutation.isPending;

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      email: "",
      branchIds: [],
      id: undefined,
    },
  });

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
        return; // Early return if ID is missing for an update
      }
      const updatePayload = staffUpdateSchema.parse(submissionData);
      updateStaffMutation.mutate(updatePayload, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    } else {
      // For creation, remove the id field if it exists
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...createValues } = submissionData;
      const createPayload = staffCreateSchema.parse(createValues);
      createStaffMutation.mutate(createPayload, {
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
            {isEditing ? "スタッフ情報の編集" : "新しいスタッフの作成"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    基本情報
                  </h3>
                  <Separator className="flex-1" />
                </div>

                {/* Name - Full width */}
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
                          placeholder="佐藤次郎"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email - Full width */}
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
                          placeholder="staff@example.com"
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

                {/* Username - Full width */}
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
                          placeholder="staff_username"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password - Full width */}
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
                    校舎配属
                  </h3>
                  <Separator className="flex-1" />
                </div>

                <FormField
                  control={form.control}
                  name="branchIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium after:content-['*'] after:ml-1 after:text-destructive">
                        勤務校舎（複数選択可）
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
                            defaultValues={defaultBranchId ? [defaultBranchId] : []}
                            renderSelectedBadge={(item, isDefault, onRemove) => (
                              <Badge
                                key={item.value}
                                variant={isDefault ? "default" : "secondary"}
                                className="flex items-center gap-1 px-3 py-1"
                              >
                                <span>{item.label}</span>
                                {isDefault && (
                                  <span className="text-xs">(デフォルト)</span>
                                )}
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
                      {defaultBranchId && (
                        <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded-md">
                          💡
                          デフォルト校舎は自動的に選択され、削除することはできません
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isBranchesLoading || isSubmitting}
              className="w-full sm:w-auto min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isEditing ? "保存中..." : "作成中..."}
                </>
              ) : (
                <>{isEditing ? "変更を保存" : "スタッフを作成"}</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
