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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubjectCreate, useSubjectUpdate } from "@/hooks/useSubjectMutation";
import { useSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import { Subject } from "@prisma/client";
import { CreateSubjectSchema } from "@/schemas/subject.schema";

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject | null;
}

export function SubjectFormDialog({
  open,
  onOpenChange,
  subject,
}: SubjectFormDialogProps) {
  const createSubjectMutation = useSubjectCreate();
  const updateSubjectMutation = useSubjectUpdate();
  const { data: subjectTypes } = useSubjectTypes();

  const isEditing = !!subject;

  const formSchema = CreateSubjectSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (subject) {
      form.reset({
        name: subject.name || "",
        subjectTypeId: subject.subjectTypeId || undefined,
        notes: subject.notes || "",
      });
    }
  }, [subject, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (isEditing && subject) {
        await updateSubjectMutation.mutateAsync({
          subjectId: subject.subjectId,
          ...values,
        });
      } else {
        await createSubjectMutation.mutateAsync(values);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("科目の保存に失敗しました:", error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "科目の編集" : "科目の作成"}</DialogTitle>
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
                    <Input placeholder="科目名を入力してください" {...field} />
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
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? null : value)
                      }
                      value={field.value || "none"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="科目タイプを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未選択</SelectItem>
                        {subjectTypes?.data.map((type) => (
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
                    <Textarea
                      placeholder="メモを入力してください（任意）"
                      {...field}
                      value={field.value || ""}
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
