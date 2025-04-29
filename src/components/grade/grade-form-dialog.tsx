"use client";

import { useState, useEffect } from "react";
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
import { useGradeCreate, useGradeUpdate } from "@/hooks/useGradeMutation";
import { useGrade } from "@/hooks/useGradeQuery";
import { CreateGradeSchema } from "@/schemas/grade.schema";
import { Grade, StudentType } from "@prisma/client";
import { useStudentTypes } from "@/hooks/useStudentTypeQuery";

interface GradeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grade?: Grade | null;
}

const studentTypeGradeConfig: Record<
  string,
  { name: string; years: number[] | null }
> = {
  小学生: { name: "小学", years: [1, 2, 3, 4, 5, 6] },
  中学生: { name: "中学", years: [1, 2, 3] },
  高校生: { name: "高校", years: [1, 2, 3] },
  浪人生: { name: "浪人生", years: null },
  大人: { name: "大人", years: null },
};

export function GradeFormDialog({
  open,
  onOpenChange,
  grade,
}: GradeFormDialogProps) {
  const [selectedStudentTypeName, setSelectedStudentTypeName] = useState<
    string | null
  >(null);
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(!!grade); // If editing, assume name was manually set

  const createGradeMutation = useGradeCreate();
  const updateGradeMutation = useGradeUpdate();
  const isSubmitting =
    createGradeMutation.isPending || updateGradeMutation.isPending;
  const { data: studentTypes } = useStudentTypes();
  const { data: gradeData } = useGrade(grade?.gradeId || "");

  const isEditing = !!grade;

  const formSchema = CreateGradeSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      studentTypeId: "",
      gradeYear: 0,
      notes: "",
    },
  });

  const gradeYear = form.watch("gradeYear");
  const studentTypeId = form.watch("studentTypeId");

  useEffect(() => {
    if (gradeData) {
      form.reset({
        name: gradeData.name || "",
        studentTypeId: gradeData.studentTypeId || "",
        gradeYear: gradeData.gradeYear || 0,
        notes: gradeData.notes || "",
      });
    }
  }, [gradeData, form]);

  useEffect(() => {
    if (studentTypeId) {
      const studentType = studentTypes?.data.find(
        (type) => type.studentTypeId === studentTypeId
      );
      setSelectedStudentTypeName(studentType?.name || null);
    } else {
      setSelectedStudentTypeName(null);
    }
  }, [form, studentTypeId, studentTypes]);

  // Only auto-generate name if it hasn't been manually edited
  useEffect(() => {
    // Only auto-generate name if it hasn't been manually edited
    if (
      !isNameManuallyEdited &&
      selectedStudentTypeName &&
      studentTypeGradeConfig[selectedStudentTypeName]
    ) {
      const config = studentTypeGradeConfig[selectedStudentTypeName];

      if (config.years === null) {
        form.setValue("name", config.name);
      } else if (gradeYear !== null && gradeYear !== undefined) {
        form.setValue("name", `${config.name}${gradeYear}年生`);
      }
    }
  }, [form, selectedStudentTypeName, gradeYear, isNameManuallyEdited]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (isEditing && grade) {
        await updateGradeMutation.mutateAsync({
          gradeId: grade.gradeId,
          ...values,
        });
      } else {
        await createGradeMutation.mutateAsync(values);
      }
      onOpenChange(false);
      form.reset();
      setIsNameManuallyEdited(false); // Reset for next time dialog opens
    } catch (error) {
      console.error("学年の保存に失敗しました:", error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "学年の編集" : "学年の作成"}</DialogTitle>
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
                    <Input
                      placeholder="学年名を入力"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setIsNameManuallyEdited(true);
                      }}
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
                  <FormLabel>学生タイプ</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value === "none" ? "" : value);
                        // Reset grade year when student type changes
                        form.setValue("gradeYear", 0);
                      }}
                      value={field.value || "none"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="学生タイプを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未選択</SelectItem>
                        {studentTypes?.data.map((type: StudentType) => (
                          <SelectItem
                            key={type.studentTypeId}
                            value={type.studentTypeId}
                          >
                            {type.name}
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
              name="gradeYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>学年</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? 0 : parseInt(value))
                      }
                      value={field.value?.toString() || "none"}
                      disabled={
                        !selectedStudentTypeName ||
                        !studentTypeGradeConfig[selectedStudentTypeName] ||
                        studentTypeGradeConfig[selectedStudentTypeName]
                          .years === null
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="学年を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未選択</SelectItem>
                        {selectedStudentTypeName &&
                          studentTypeGradeConfig[selectedStudentTypeName] &&
                          studentTypeGradeConfig[selectedStudentTypeName]
                            .years &&
                          studentTypeGradeConfig[
                            selectedStudentTypeName
                          ].years!.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}年生
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メモ</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="メモを入力（任意）"
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
