"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useTeacherCreate, useTeacherUpdate } from "@/hooks/useTeacherMutation";
import {
  teacherFormSchema,
  teacherCreateSchema,
  teacherUpdateSchema,
  type TeacherFormValues,
} from "@/schemas/teacher.schema";
import type { Teacher } from "@/hooks/useTeacherQuery";
import { useSession } from "next-auth/react";

interface TeacherFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Teacher | null;
}

export function TeacherFormDialog({
  open,
  onOpenChange,
  teacher,
}: TeacherFormDialogProps) {
  const createTeacherMutation = useTeacherCreate();
  const updateTeacherMutation = useTeacherUpdate();
  const { data: session } = useSession();
  const branchesResponse = session?.user?.branches
    ? { data: session.user.branches }
    : { data: [] };
  const isBranchesLoading = !session?.user?.branches;

  // Branch selection state
  const [branchSearchTerm, setBranchSearchTerm] = useState("");
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  // Get default branch id (first in user's branches)
  const defaultBranchId = session?.user?.branches?.[0]?.branchId;

  const isEditing = !!teacher;
  const isSubmitting =
    createTeacherMutation.isPending || updateTeacherMutation.isPending;

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      name: "",
      kanaName: "",
      email: "",
      lineId: "",
      notes: "",
      username: "",
      password: "",
      branchIds: [],
      teacherId: undefined,
    },
  });

  useEffect(() => {
    if (teacher) {
      const branchIds =
        teacher.branches?.map(
          (branch: { branchId: string }) => branch.branchId
        ) || [];
      // Ensure defaultBranchId is always included
      const branchIdsWithDefault =
        defaultBranchId && !branchIds.includes(defaultBranchId)
          ? [defaultBranchId, ...branchIds]
          : branchIds;
      form.reset({
        teacherId: teacher.teacherId,
        name: teacher.name || "",
        kanaName: teacher.kanaName || "",
        email: teacher.email || "",
        lineId: teacher.lineId || "",
        notes: teacher.notes || "",
        username: teacher.username || "",
        password: "",
        branchIds: branchIdsWithDefault,
      });
    } else {
      form.reset({
        name: "",
        kanaName: "",
        email: "",
        lineId: "",
        notes: "",
        username: "",
        password: "",
        branchIds: defaultBranchId ? [defaultBranchId] : [],
        teacherId: undefined,
      });
    }
  }, [teacher, form, defaultBranchId]);

  function onSubmit(values: TeacherFormValues) {
    const submissionData = { ...values };

    if (isEditing && teacher) {
      if (!submissionData.password || submissionData.password === "") {
        delete submissionData.password;
      }
      const parsedData = teacherUpdateSchema.parse({
        ...submissionData,
        teacherId: teacher.teacherId,
      });
      updateTeacherMutation.mutate(parsedData, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { teacherId, ...createValues } = submissionData;
      const parsedData = teacherCreateSchema.parse(createValues);
      createTeacherMutation.mutate(parsedData, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  }

  // Filter branches based on search term
  const filteredBranches =
    branchesResponse?.data.filter(
      (branch: { branchId: string; name: string }) =>
        branch.name.toLowerCase().includes(branchSearchTerm.toLowerCase())
    ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? "教師情報の編集" : "新しい教師の作成"}
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

                {/* Name and Kana - Responsive grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                            placeholder="山田太郎"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="kanaName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          カナ
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ヤマダタロウ"
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

                {/* Email and LINE ID - Responsive grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          メールアドレス
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="example@school.com"
                            className="h-11"
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
                    name="lineId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          LINE ID
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="line_id_example"
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
                          placeholder="teacher_username"
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
                    支店配属
                  </h3>
                  <Separator className="flex-1" />
                </div>

                <FormField
                  control={form.control}
                  name="branchIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium after:content-['*'] after:ml-1 after:text-destructive">
                        担当支店（複数選択可）
                      </FormLabel>
                      <FormControl>
                        {isBranchesLoading ? (
                          <div className="flex items-center justify-center h-11 border rounded-lg bg-muted/50">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-muted-foreground">
                              支店情報を読み込み中...
                            </span>
                          </div>
                        ) : (
                          <div className="relative">
                            <Input
                              placeholder="支店名を検索..."
                              value={branchSearchTerm}
                              onChange={(e) => {
                                setBranchSearchTerm(e.target.value);
                                setShowBranchDropdown(
                                  e.target.value.trim() !== ""
                                );
                              }}
                              onFocus={() => {
                                if (branchSearchTerm.trim() !== "") {
                                  setShowBranchDropdown(true);
                                }
                              }}
                              onBlur={() => {
                                setTimeout(
                                  () => setShowBranchDropdown(false),
                                  200
                                );
                              }}
                              className="h-11"
                            />

                            {showBranchDropdown && (
                              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                                {filteredBranches.map(
                                  (branch: {
                                    branchId: string;
                                    name: string;
                                  }) => {
                                    const isAlreadySelected =
                                      field.value?.includes(branch.branchId);
                                    const isDefault =
                                      branch.branchId === defaultBranchId;

                                    return (
                                      <div
                                        key={branch.branchId}
                                        className={`p-3 hover:bg-accent cursor-pointer flex items-center justify-between ${
                                          isAlreadySelected
                                            ? "bg-accent/50"
                                            : ""
                                        }`}
                                        onClick={() => {
                                          if (!isAlreadySelected) {
                                            const currentValues =
                                              field.value || [];
                                            let newValues = [
                                              ...currentValues,
                                              branch.branchId,
                                            ];

                                            // Always ensure default branch is included
                                            if (
                                              defaultBranchId &&
                                              !newValues.includes(
                                                defaultBranchId
                                              )
                                            ) {
                                              newValues = [
                                                defaultBranchId,
                                                ...newValues,
                                              ];
                                            }

                                            field.onChange(newValues);
                                          }
                                          setBranchSearchTerm("");
                                          setShowBranchDropdown(false);
                                        }}
                                      >
                                        <span className="flex-1">
                                          {branch.name}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          {isDefault && (
                                            <Badge
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              デフォルト
                                            </Badge>
                                          )}
                                          {isAlreadySelected && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              選択済み
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                                {filteredBranches.length === 0 && (
                                  <div className="p-3 text-muted-foreground text-center">
                                    該当する支店が見つかりません
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </FormControl>

                      {/* Display selected branches */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {(field.value || []).map((branchId, index) => {
                          const branch = branchesResponse?.data.find(
                            (b: { branchId: string; name: string }) =>
                              b.branchId === branchId
                          );
                          const isDefault = branchId === defaultBranchId;

                          return (
                            <Badge
                              key={index}
                              variant={isDefault ? "default" : "secondary"}
                              className="flex items-center gap-1 px-3 py-1"
                            >
                              <span>{branch?.name || branchId}</span>
                              {isDefault && (
                                <span className="text-xs">(デフォルト)</span>
                              )}
                              {!isDefault && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1 hover:bg-muted rounded-full"
                                  onClick={() => {
                                    const newValues = [...(field.value || [])];
                                    newValues.splice(index, 1);
                                    field.onChange(newValues);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </Badge>
                          );
                        })}
                      </div>

                      <FormMessage />
                      {defaultBranchId && (
                        <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded-md">
                          💡
                          デフォルト支店は自動的に選択され、削除することはできません
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    追加情報
                  </h3>
                  <Separator className="flex-1" />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        備考
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="特記事項や備考があれば入力してください..."
                          className="min-h-[80px] resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
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
                <>{isEditing ? "変更を保存" : "教師を作成"}</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
