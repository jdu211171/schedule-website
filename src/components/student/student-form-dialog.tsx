// src/components/student/student-form-dialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

import {
  StudentCreate,
  StudentUpdate,
  studentCreateSchema,
  studentUpdateSchema,
  StudentFormValues,
  studentFormSchema,
} from "@/schemas/student.schema";
import { useStudentCreate, useStudentUpdate } from "@/hooks/useStudentMutation"; // Corrected import path
import { useStudentTypes } from "@/hooks/useStudentTypeQuery";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Student } from "@/hooks/useStudentQuery"; // Corrected import path

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
  const { data: session } = useSession();

  const branchesResponse = session?.user?.branches
    ? { data: session.user.branches }
    : { data: [] };
  const isBranchesLoading = !session?.user?.branches;

  const { data: studentTypesResponse, isLoading: isStudentTypesLoading } =
    useStudentTypes();

  const isEditing = !!student;

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      kanaName: "",
      studentTypeId: undefined,
      gradeYear: undefined,
      lineId: "",
      notes: "",
      username: "",
      password: "",
      email: "",
      branchIds: [],
      studentId: undefined,
    },
  });

  const defaultBranchId = session?.user?.branches?.[0]?.branchId;

  useEffect(() => {
    if (student) {
      const branchIds = student.branches?.map((branch) => branch.branchId) || [];
      // Ensure defaultBranchId is always included
      const branchIdsWithDefault = defaultBranchId && !branchIds.includes(defaultBranchId)
        ? [defaultBranchId, ...branchIds]
        : branchIds;
      form.reset({
        studentId: student.studentId,
        name: student.name || "",
        kanaName: student.kanaName || "",
        studentTypeId: student.studentTypeId || undefined,
        gradeYear: student.gradeYear ?? undefined,
        lineId: student.lineId || "",
        notes: student.notes || "",
        username: student.username || "",
        email: student.email || "",
        password: "",
        branchIds: branchIdsWithDefault,
      });
    } else {
      // For create, default to defaultBranchId only
      form.reset({
        name: "",
        kanaName: "",
        studentTypeId: undefined,
        gradeYear: undefined,
        lineId: "",
        notes: "",
        username: "",
        password: "",
        email: "",
        branchIds: defaultBranchId ? [defaultBranchId] : [],
        studentId: undefined,
      });
    }
  }, [student, form, defaultBranchId]);

  function onSubmit(values: StudentFormValues) {
    const submissionData = { ...values };

    if (typeof submissionData.gradeYear === "string" && submissionData.gradeYear === "") {
      submissionData.gradeYear = undefined;
    } else if (submissionData.gradeYear) {
      submissionData.gradeYear = Number(submissionData.gradeYear);
    }

    if (isEditing && student) {
      if (!submissionData.password || submissionData.password === "") {
        delete submissionData.password;
      }
      const parsedData = studentUpdateSchema.parse({
        ...submissionData,
        studentId: student.studentId,
      });
      updateStudentMutation.mutate(parsedData as StudentUpdate, {
        onSuccess: () => {
          onOpenChange(false);
          // form.reset(); // Reset handled by useEffect or if dialog closes and reopens
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { studentId, ...createValues } = submissionData;
      const parsedData = studentCreateSchema.parse(createValues);
      createStudentMutation.mutate(parsedData as StudentCreate, {
        onSuccess: () => {
          onOpenChange(false);
          // form.reset(); // Reset handled by useEffect or if dialog closes and reopens
        },
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "生徒の編集" : "生徒の作成"}</DialogTitle>
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

            <div className="flex space-x-4">
              <FormField
                control={form.control}
                name="studentTypeId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>生徒タイプ</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined} // Ensure value is string or undefined
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="生徒タイプを選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                  <FormItem className="flex-1">
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
