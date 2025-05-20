// src/components/student/student-form-dialog.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudentCreate, useStudentUpdate } from "@/hooks/useStudentMutation";
import { useBranches } from "@/hooks/useBranchQuery";
import { useStudentTypes } from "@/hooks/useStudentTypeQuery";
import {
  studentUpdateSchema,
  StudentUpdate,
  StudentCreate,
} from "@/schemas/student.schema";
import { Student } from "@/hooks/useStudentQuery";

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
}

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
}: StudentFormDialogProps) {
  const createStudentMutation = useStudentCreate();
  const updateStudentMutation = useStudentUpdate();
  const { data: branchesResponse, isLoading: isBranchesLoading } =
    useBranches();
  const { data: studentTypesResponse, isLoading: isStudentTypesLoading } =
    useStudentTypes();

  const isEditing = !!student;

  // Define a modified update schema that makes password optional
  const editSchema = studentUpdateSchema.extend({
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional(),
  });

  // Always use StudentUpdate and editSchema for the form
  const form = useForm<StudentUpdate>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      kanaName: "",
      studentTypeId: "",
      gradeYear: undefined as unknown as number,
      lineId: "",
      notes: "",
      username: "",
      password: "",
      email: "",
      branchIds: [],
    },
  });

  useEffect(() => {
    if (student) {
      // When editing, populate the form with existing student data
      form.reset({
        studentId: student.studentId,
        name: student.name || "",
        kanaName: student.kanaName || "",
        studentTypeId: student.studentTypeId || "",
        gradeYear: (student.gradeYear as unknown as number) || undefined,
        lineId: student.lineId || "",
        notes: student.notes || "",
        username: student.username || "",
        email: student.email || "",
        // Don't prefill password
        password: undefined,
        // Extract branchIds from the student's branches
        branchIds: student.branches?.map((branch) => branch.branchId) || [],
      });
    } else {
      // Reset form when creating a new student
      form.reset({
        name: "",
        kanaName: "",
        studentTypeId: "",
        gradeYear: undefined as unknown as number,
        lineId: "",
        notes: "",
        username: "",
        password: "",
        email: "",
        branchIds: [],
      });
    }
  }, [student, form]);

  function onSubmit(values: StudentUpdate) {
    // Close the dialog immediately for better UX
    onOpenChange(false);

    // Create a modified submission object
    const submissionData = { ...values };

    // Ensure gradeYear is a number if provided
    if (submissionData.gradeYear) {
      submissionData.gradeYear = Number(submissionData.gradeYear);
    }

    // If password is empty in edit mode, remove it from the submission
    if (
      isEditing &&
      (!submissionData.password || submissionData.password === "")
    ) {
      delete submissionData.password;
    }

    // Then trigger the mutation without waiting
    if (isEditing && student) {
      updateStudentMutation.mutate({
        ...submissionData,
        studentId: student.studentId,
      });
    } else {
      // Remove studentId from submissionData for create
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { studentId, ...createData } = submissionData;
      createStudentMutation.mutate(createData as StudentCreate);
    }

    // Reset the form
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "生徒の編集" : "生徒の作成"}</DialogTitle>
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
              name="studentTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>生徒タイプ</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="生徒タイプを選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">選択なし</SelectItem>
                      {studentTypesResponse?.data.map((type) => (
                        <SelectItem
                          key={type.studentTypeId}
                          value={type.studentTypeId}
                        >
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gradeYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>学年</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="学年を入力してください"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => {
                        const value =
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value);
                        field.onChange(value);
                      }}
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
              <Button
                type="submit"
                disabled={isBranchesLoading || isStudentTypesLoading}
              >
                {isEditing ? "変更を保存" : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
