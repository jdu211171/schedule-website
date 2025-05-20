// src/components/teacher/teacher-form-dialog.tsx
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTeacherCreate, useTeacherUpdate } from "@/hooks/useTeacherMutation";
import { useBranches } from "@/hooks/useBranchQuery";
import {
  teacherUpdateSchema,
  TeacherUpdate,
  TeacherCreate,
} from "@/schemas/teacher.schema";
import { Teacher } from "@/hooks/useTeacherQuery";

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
  const { data: branchesResponse, isLoading: isBranchesLoading } =
    useBranches();

  const isEditing = !!teacher;

  // Define a modified update schema that makes password optional
  const editSchema = teacherUpdateSchema.extend({
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional(),
  });

  // Always use TeacherUpdate and editSchema for the form
  const form = useForm<TeacherUpdate>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      kanaName: "",
      email: "",
      lineId: "",
      notes: "",
      username: "",
      password: "",
      branchIds: [],
    },
  });

  useEffect(() => {
    if (teacher) {
      // When editing, populate the form with existing teacher data
      form.reset({
        teacherId: teacher.teacherId,
        name: teacher.name || "",
        kanaName: teacher.kanaName || "",
        email: teacher.email || "",
        lineId: teacher.lineId || "",
        notes: teacher.notes || "",
        username: teacher.username || "",
        // Don't prefill password
        password: undefined,
        // Extract branchIds from the teacher's branches
        branchIds: teacher.branches?.map((branch) => branch.branchId) || [],
      });
    } else {
      // Reset form when creating a new teacher
      form.reset({
        name: "",
        kanaName: "",
        email: "",
        lineId: "",
        notes: "",
        username: "",
        password: "",
        branchIds: [],
      });
    }
  }, [teacher, form]);

  function onSubmit(values: TeacherUpdate) {
    // Close the dialog immediately for better UX
    onOpenChange(false);

    // Create a modified submission object
    const submissionData = { ...values };

    // If password is empty in edit mode, remove it from the submission
    if (
      isEditing &&
      (!submissionData.password || submissionData.password === "")
    ) {
      delete submissionData.password;
    }

    // Then trigger the mutation without waiting
    if (isEditing && teacher) {
      // Spread submissionData first, then override teacherId
      updateTeacherMutation.mutate({
        ...submissionData,
        teacherId: teacher.teacherId,
      });
    } else {
      // Remove teacherId from submissionData for create
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { teacherId, ...createData } = submissionData;
      createTeacherMutation.mutate(createData as TeacherCreate);
    }

    // Reset the form
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "教師の編集" : "教師の作成"}</DialogTitle>
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
              name="kanaName"
              render={({ field }) => (
                <FormItem>
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
                <FormItem>
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
                            {branchesResponse?.data.map((branch) => (
                              <FormField
                                key={branch.branchId}
                                control={form.control}
                                name="branchIds"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={branch.branchId}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(
                                            branch.branchId
                                          )}
                                          onCheckedChange={(checked) => {
                                            const currentValues = [
                                              ...(field.value || []),
                                            ];
                                            if (checked) {
                                              if (
                                                !currentValues.includes(
                                                  branch.branchId
                                                )
                                              ) {
                                                field.onChange([
                                                  ...currentValues,
                                                  branch.branchId,
                                                ]);
                                              }
                                            } else {
                                              field.onChange(
                                                currentValues.filter(
                                                  (value) =>
                                                    value !== branch.branchId
                                                )
                                              );
                                            }
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal cursor-pointer">
                                        {branch.name}
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
