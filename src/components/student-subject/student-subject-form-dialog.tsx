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
import { useStudents } from "@/hooks/useStudentQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import { useSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import {
  useStudentPreferenceSubjectCreate,
  useStudentPreferenceSubjectUpdate,
} from "@/hooks/useStudentPreferenceSubjectMutation";
import { StudentPreferenceSubjectWithRelations } from "@/hooks/useStudentPreferenceSubjectQuery";

// Create a custom schema that enforces required fields with custom error messages
const StudentSubjectFormSchema = z.object({
  studentId: z
    .string({
      required_error: "生徒を選択してください",
    })
    .min(1, "生徒を選択してください"),
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

type FormValues = z.infer<typeof StudentSubjectFormSchema>;

interface StudentSubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentSubject?: StudentPreferenceSubjectWithRelations | null;
}

export function StudentSubjectFormDialog({
  open,
  onOpenChange,
  studentSubject,
}: StudentSubjectFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createStudentSubjectMutation = useStudentPreferenceSubjectCreate();
  const updateStudentSubjectMutation = useStudentPreferenceSubjectUpdate();

  const isEditing = !!studentSubject;
  const { data: students } = useStudents();
  const { data: subjects } = useSubjects();
  const { data: subjectTypesResponse } = useSubjectTypes();

  const form = useForm<FormValues>({
    resolver: zodResolver(StudentSubjectFormSchema),
    defaultValues: {
      studentId: "",
      subjectId: "",
      subjectTypeId: "",
      notes: "",
    },
    mode: "onSubmit", // Validate on submit
  });

  // Set form values when editing an existing student subject
  useEffect(() => {
    if (studentSubject && open) {
      form.reset({
        studentId: studentSubject.studentPreference.student.studentId,
        subjectId: studentSubject.subjectId,
        subjectTypeId: studentSubject.subjectTypeId,
        notes: studentSubject.notes || "",
      });
    } else if (!studentSubject && open) {
      // Reset form when creating a new student subject
      form.reset({
        studentId: "",
        subjectId: "",
        subjectTypeId: "",
        notes: "",
      });
    }
  }, [studentSubject, form, open]);

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
      if (isEditing && studentSubject) {
        await updateStudentSubjectMutation.mutateAsync({
          id: studentSubject.id,
          notes: values.notes,
        });
      } else {
        await createStudentSubjectMutation.mutateAsync(values);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("生徒科目割り当ての保存に失敗しました:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "生徒科目割り当ての編集" : "生徒科目割り当ての作成"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>生徒</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="生徒を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {students?.data?.map((student) => (
                          <SelectItem
                            key={student.studentId}
                            value={student.studentId}
                          >
                            {student.name}
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
