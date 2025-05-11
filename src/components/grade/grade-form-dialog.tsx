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
import { CreateGradeSchema } from "@/schemas/grade.schema";
import { Grade, StudentType } from "@prisma/client";
import { useStudentTypes } from "@/hooks/useStudentTypeQuery";

interface GradeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grade?: Grade | null;
}

export function GradeFormDialog({
  open,
  onOpenChange,
  grade,
}: GradeFormDialogProps) {
  const [selectedStudentType, setSelectedStudentType] =
    useState<StudentType | null>(null);
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(!!grade);

  const createGradeMutation = useGradeCreate();
  const updateGradeMutation = useGradeUpdate();
  const { data: studentTypes } = useStudentTypes();

  const isEditing = !!grade;
  const formSchema = CreateGradeSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: grade?.name || "",
      studentTypeId: grade?.studentTypeId || "",
      gradeYear: grade?.gradeYear || 0,
      notes: grade?.notes || "",
    },
  });

  const gradeYear = form.watch("gradeYear");
  const studentTypeId = form.watch("studentTypeId");

  useEffect(() => {
    if (grade) {
      form.reset({
        name: grade.name || "",
        studentTypeId: grade.studentTypeId || "",
        gradeYear: grade.gradeYear || 0,
        notes: grade.notes || "",
      });
    } else {
      form.reset({
        name: "",
        studentTypeId: "",
        gradeYear: 0,
        notes: "",
      });
    }
  }, [grade, form]);

  useEffect(() => {
    if (studentTypeId && studentTypes?.data) {
      const found =
        studentTypes.data.find(
          (type: StudentType) => type.studentTypeId === studentTypeId
        ) || null;
      setSelectedStudentType(found);
    } else {
      setSelectedStudentType(null);
    }
  }, [studentTypeId, studentTypes]);

  // Only auto-generate name if it hasn't been manually edited
  useEffect(() => {
    if (!isNameManuallyEdited && selectedStudentType) {
      if (!selectedStudentType.maxYears) {
        form.setValue("name", selectedStudentType.name);
      } else if (
        gradeYear !== null &&
        gradeYear !== undefined &&
        gradeYear > 0
      ) {
        form.setValue("name", `${selectedStudentType.name}${gradeYear}年生`);
      }
    }
  }, [form, selectedStudentType, gradeYear, isNameManuallyEdited]);

  // Generate grade year options based on selectedStudentType.maxYears
  const gradeYearOptions =
    selectedStudentType?.maxYears &&
    typeof selectedStudentType.maxYears === "number"
      ? Array.from({ length: selectedStudentType.maxYears }, (_, i) => i + 1)
      : [];

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Ensure the notes field is explicitly included, even if empty
    const updatedValues = {
      ...values,
      notes: values.notes ?? "", // Ensure notes is at least an empty string, not undefined
    };

    // Close the dialog immediately for better UX
    onOpenChange(false);
    form.reset();

    // Then trigger the mutation
    if (isEditing && grade) {
      updateGradeMutation.mutate({
        gradeId: grade.gradeId,
        ...updatedValues,
        studentType: selectedStudentType as StudentType, // Ensure studentType is included
      });
    } else {
      createGradeMutation.mutate({
        ...updatedValues,
        studentType: selectedStudentType as StudentType, // Ensure studentType is included
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          // Reset form when dialog is closed
          form.reset();
          setIsNameManuallyEdited(false);
        }
        onOpenChange(open);
      }}
    >
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
                        form.setValue("gradeYear", 0);
                      }}
                      value={field.value || "none"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="学生タイプを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未選択</SelectItem>
                        {studentTypes?.data?.map((type: StudentType) => (
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
            {gradeYearOptions.length > 0 && (
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
                          !selectedStudentType || !selectedStudentType.maxYears
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="学年を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">未選択</SelectItem>
                          {gradeYearOptions.map((year) => (
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
            )}
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
                      value={field.value ?? ""} // Ensure value is never null
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{isEditing ? "変更を保存" : "作成"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
