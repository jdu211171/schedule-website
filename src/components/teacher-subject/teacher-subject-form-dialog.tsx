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
import {
  useTeacherSubjectCreate,
  useTeacherSubjectUpdate,
} from "@/hooks/useTeacherSubjectMutation";
import { TeacherSubject } from "@prisma/client";
import { CreateTeacherSubjectSchema } from "@/schemas/teacher-subject.schema";

interface TeacherSubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherSubject?: TeacherSubject | null;
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
  console.log(updateTeacherSubjectMutation.error);

  const form = useForm<z.infer<typeof CreateTeacherSubjectSchema>>({
    resolver: zodResolver(CreateTeacherSubjectSchema),
    defaultValues: {
      teacherId: teacherSubject?.teacherId || "",
      subjectId: teacherSubject?.subjectId || "",
      notes: teacherSubject?.notes || "",
    },
  });

  async function onSubmit(values: z.infer<typeof CreateTeacherSubjectSchema>) {
    setIsSubmitting(true);
    try {
      if (isEditing && teacherSubject) {
        console.log("values: ", values);
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="科目を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects?.data.map((subject) => (
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メモ</FormLabel>
                  <FormControl>
                    <Input placeholder="メモを入力" {...field} />
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
