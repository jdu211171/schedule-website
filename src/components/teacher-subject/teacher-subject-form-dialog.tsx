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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import { useSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import {
  useTeacherSubjectCreate,
  useTeacherSubjectUpdate,
} from "@/hooks/useTeacherSubjectMutation";
import { TeacherSubjectWithRelations } from "./teacher-subject-table";

// Create a custom schema that enforces required fields with custom error messages
const TeacherSubjectFormSchema = z.object({
  teacherId: z
    .string({
      required_error: "講師を選択してください",
    })
    .min(1, "講師を選択してください"),
  subjectId: z
    .string({
      required_error: "科目を選択してください",
    })
    .min(1, "科目を選択してください"),
  subjectTypeId: z
    .string({
      required_error: "科目タイプを選択してください",
    })
    .min(1, "科目タイプを選択してください"),
  notes: z
    .string()
    .max(255, { message: "備考は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

type FormValues = z.infer<typeof TeacherSubjectFormSchema>;

interface TeacherSubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherSubject?: TeacherSubjectWithRelations | null;
}

export function TeacherSubjectFormDialog({
  open,
  onOpenChange,
  teacherSubject,
}: TeacherSubjectFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createTeacherSubjectMutation = useTeacherSubjectCreate();
  const updateTeacherSubjectMutation = useTeacherSubjectUpdate();

  const isEditing = !!teacherSubject;
  const { data: teachers } = useTeachers();
  const { data: subjects } = useSubjects();
  const { data: subjectTypesResponse } = useSubjectTypes();

  const form = useForm<FormValues>({
    resolver: zodResolver(TeacherSubjectFormSchema),
    defaultValues: {
      teacherId: "",
      subjectId: "",
      subjectTypeId: "",
      notes: "",
    },
    mode: "onSubmit", // Validate on submit
  });

  // Set form values when editing an existing teacher subject
  useEffect(() => {
    if (teacherSubject && open) {
      form.reset({
        teacherId: teacherSubject.teacherId,
        subjectId: teacherSubject.subjectId,
        subjectTypeId: teacherSubject.subjectTypeId,
        notes: teacherSubject.notes || "",
      });
    } else if (!teacherSubject && open) {
      // Reset form when creating a new teacher subject
      form.reset({
        teacherId: "",
        subjectId: "",
        subjectTypeId: "",
        notes: "",
      });
    }
  }, [teacherSubject, form, open]);

  // Filter subject types based on selected subject
  const selectedSubjectId = form.watch("subjectId");
  const availableSubjectTypes =
    selectedSubjectId && subjectTypesResponse?.data
      ? subjectTypesResponse.data.filter((type) => {
          const subject = subjects?.data.find(
            (s) => s.subjectId === selectedSubjectId
          );
          return subject?.subjectToSubjectTypes.some(
            (st) => st.subjectTypeId === type.subjectTypeId
          );
        })
      : [];

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateTeacherSubjectMutation.mutateAsync(values);
      } else {
        await createTeacherSubjectMutation.mutateAsync(values);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("講師科目割り当ての保存に失敗しました:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "講師科目割り当ての編集" : "講師科目割り当ての作成"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>講師</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="講師を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers?.data?.map((teacher) => (
                          <SelectItem
                            key={teacher.teacherId}
                            value={teacher.teacherId}
                          >
                            {teacher.name}
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
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>科目</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Reset subject type when subject changes
                        form.setValue("subjectTypeId", "");
                      }}
                      value={field.value}
                      disabled={isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="科目を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects?.data?.map((subject) => (
                          <SelectItem
                            key={subject.subjectId}
                            value={subject.subjectId}
                          >
                            {subject.name}
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
              name="subjectTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>科目タイプ</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={
                        isEditing ||
                        !selectedSubjectId ||
                        availableSubjectTypes.length === 0
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="科目タイプを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubjectTypes.map((type) => (
                          <SelectItem
                            key={type.subjectTypeId}
                            value={type.subjectTypeId}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メモ</FormLabel>
                  <FormControl>
                    <Input
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
