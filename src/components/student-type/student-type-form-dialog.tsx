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
import { Textarea } from "@/components/ui/textarea";
import {
  useStudentTypeCreate,
  useStudentTypeUpdate,
} from "@/hooks/useStudentTypeMutation";
import { StudentType } from "@prisma/client";
import { CreateStudentTypeSchema } from "@/schemas/student-type.schema";

interface StudentTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentType?: StudentType | null;
}

export function StudentTypeFormDialog({
  open,
  onOpenChange,
  studentType,
}: StudentTypeFormDialogProps) {
  const createStudentTypeMutation = useStudentTypeCreate();
  const updateStudentTypeMutation = useStudentTypeUpdate();

  const isSubmitting =
    createStudentTypeMutation.isPending || updateStudentTypeMutation.isPending;
  const isEditing = !!studentType;

  const formSchema = CreateStudentTypeSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: studentType?.name || "",
      description: studentType?.description || "",
      maxYears: studentType?.maxYears || undefined,
    },
  });

  useEffect(() => {
    if (studentType) {
      form.reset({
        name: studentType.name || "",
        description: studentType.description || "",
        maxYears: studentType.maxYears || undefined,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        maxYears: undefined,
      });
    }
  }, [studentType, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Close the dialog immediately for better UX
    onOpenChange(false);
    form.reset();

    if (isEditing && studentType) {
      updateStudentTypeMutation.mutate({
        studentTypeId: studentType.studentTypeId,
        ...values,
      });
    } else {
      createStudentTypeMutation.mutate(values);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          // Reset form when dialog is closed
          form.reset();
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "生徒タイプの編集" : "生徒タイプの作成"}
          </DialogTitle>
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
                    <Input
                      placeholder="生徒タイプ名を入力してください"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxYears"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>最大学年数</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="最大学年数を入力（例: 小学校=6）"
                      value={field.value === undefined ? "" : field.value}
                      onChange={(e) => {
                        const value = e.target.value
                          ? parseInt(e.target.value, 10)
                          : undefined;
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="説明を入力してください（任意）"
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
                {isEditing ? "変更を保存" : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
