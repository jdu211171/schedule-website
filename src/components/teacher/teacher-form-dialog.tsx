// src/components/teacher/teacher-form-dialog.tsx
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
import { useTeacherCreate, useTeacherUpdate } from "@/hooks/useTeacherMutation";
import {
  teacherFormSchema,
  teacherCreateSchema,
  teacherUpdateSchema,
  type TeacherFormValues,
} from "@/schemas/teacher.schema";
import { Teacher } from "@/hooks/useTeacherQuery";
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

  // Get default branch id (first in user's branches)
  const defaultBranchId = session?.user?.branches?.[0]?.branchId;

  const isEditing = !!teacher;

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
      const branchIds = teacher.branches?.map((branch: { branchId: string }) => branch.branchId) || [];
      // Ensure defaultBranchId is always included
      const branchIdsWithDefault = defaultBranchId && !branchIds.includes(defaultBranchId)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "教師の編集" : "教師の作成"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex space-x-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
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
                name="kanaName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>カナ</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="カナを入力してください"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <div className="flex space-x-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex-1">
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
                name="lineId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>LINE ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="LINE IDを入力してください"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>備考</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="備考を入力してください"
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
                            {branchesResponse?.data.map((branch: { branchId: string; name: string }) => (
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
