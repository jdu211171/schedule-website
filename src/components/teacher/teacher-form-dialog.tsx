"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeacherCreate, useTeacherUpdate } from "@/hooks/useTeacherMutation";
import { teacherCreateSchema } from "@/schemas/teacher.schema";
import { Teacher } from "@prisma/client";
import { useEvaluations } from "@/hooks/useEvaluationQuery";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createTeacherMutation = useTeacherCreate();
  const updateTeacherMutation = useTeacherUpdate();
  const { data: evaluations = [] } = useEvaluations();

  const isEditing = !!teacher;

  const formSchema = teacherCreateSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: teacher?.name || "",
      evaluationId: teacher?.evaluationId || null,
      birthDate: teacher?.birthDate || null,
      mobileNumber: teacher?.mobileNumber || "",
      email: teacher?.email || "",
      highSchool: teacher?.highSchool || "",
      university: teacher?.university || "",
      faculty: teacher?.faculty || "",
      department: teacher?.department || "",
      enrollmentStatus: teacher?.enrollmentStatus || "",
      otherUniversities: teacher?.otherUniversities || "",
      englishProficiency: teacher?.englishProficiency || "",
      toeic: teacher?.toeic || null,
      toefl: teacher?.toefl || null,
      mathCertification: teacher?.mathCertification || "",
      kanjiCertification: teacher?.kanjiCertification || "",
      otherCertifications: teacher?.otherCertifications || "",
      notes: teacher?.notes || "",
    },
  });

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (isEditing && teacher) {
        await updateTeacherMutation.mutateAsync({
          teacherId: teacher.teacherId,
          ...values,
        });
      } else {
        await createTeacherMutation.mutateAsync(values);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("講師の保存に失敗しました:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "講師の編集" : "講師の作成"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名前</FormLabel>
                  <FormControl>
                    <Input placeholder="講師の名前を入力" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="evaluationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>評価</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? null : value)
                      }
                      value={field.value || "none"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="評価を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未選択</SelectItem>
                        {evaluations.map((evaluation) => (
                          <SelectItem
                            key={evaluation.evaluationId}
                            value={evaluation.evaluationId}
                          >
                            {evaluation.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>生年月日</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={
                        field.value instanceof Date
                          ? formatDate(field.value)
                          : ""
                      }
                      onChange={(e) => {
                        const dateValue = e.target.value
                          ? new Date(e.target.value)
                          : null;
                        field.onChange(dateValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobileNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>携帯電話番号</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="携帯電話番号を入力"
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
                      placeholder="メールアドレスを入力"
                      type="email"
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
              name="highSchool"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>出身高校</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="出身高校を入力"
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
              name="university"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>大学</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="大学を入力"
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
              name="faculty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>学部</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="学部を入力"
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
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>学科</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="学科を入力"
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
              name="enrollmentStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>在籍状況</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="在籍状況を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="在学中">在学中</SelectItem>
                        <SelectItem value="卒業">卒業</SelectItem>
                        <SelectItem value="休学中">休学中</SelectItem>
                        <SelectItem value="中退">中退</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="otherUniversities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>その他の大学</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="その他の大学を入力"
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
              name="englishProficiency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>英語能力</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="英語能力を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ネイティブ">ネイティブ</SelectItem>
                        <SelectItem value="ビジネス">ビジネス</SelectItem>
                        <SelectItem value="日常会話">日常会話</SelectItem>
                        <SelectItem value="基礎">基礎</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toeic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TOEIC</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="TOEICスコアを入力"
                      value={field.value === null ? "" : field.value}
                      onChange={(e) => {
                        const value =
                          e.target.value === ""
                            ? null
                            : parseInt(e.target.value, 10);
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
              name="toefl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TOEFL</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="TOEFLスコアを入力"
                      value={field.value === null ? "" : field.value}
                      onChange={(e) => {
                        const value =
                          e.target.value === ""
                            ? null
                            : parseInt(e.target.value, 10);
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
              name="mathCertification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>数学検定</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="数学検定を入力"
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
              name="kanjiCertification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>漢字検定</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="漢字検定を入力"
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
              name="otherCertifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>その他資格</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="その他の資格を入力"
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
                  <FormLabel>メモ</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="メモを入力"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "保存中..." : isEditing ? "変更を保存" : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
