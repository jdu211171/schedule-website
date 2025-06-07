// src/components/student-type-form-dialog.tsx
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useStudentTypeCreate,
  useStudentTypeUpdate,
} from "@/hooks/useStudentTypeMutation";
import { StudentType } from "@/hooks/useStudentTypeQuery";
import { useSession } from "next-auth/react";

// Form schema for student type creation/editing
const studentTypeFormSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  maxYears: z
    .string()
    .transform((val) => (val === "" ? undefined : parseInt(val, 10)))
    .optional(),
  description: z.string().max(255).optional().nullable(),
  order: z.coerce.number().int().min(1).optional().nullable(),
});

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
  const isEditing = !!studentType;
  const { data: session } = useSession();

  const form = useForm<z.infer<typeof studentTypeFormSchema>>({
    resolver: zodResolver(studentTypeFormSchema),
    defaultValues: {
      name: studentType?.name || "",
      maxYears: studentType?.maxYears || undefined,
      description: studentType?.description ?? "",
      order: studentType?.order ?? undefined,
    },
  });

  useEffect(() => {
    if (studentType) {
      form.reset({
        name: studentType.name || "",
        maxYears: studentType.maxYears || undefined,
        description: studentType.description ?? "",
        order: studentType.order ?? undefined,
      });
    } else {
      form.reset({
        name: "",
        maxYears: undefined,
        description: "",
        order: undefined,
      });
    }
  }, [studentType, form]);

  function onSubmit(values: z.infer<typeof studentTypeFormSchema>) {
    // Ensure the description field is explicitly included, even if empty
    const updatedValues = {
      ...values,
      description: values.description ?? "", // Ensure description is at least an empty string, not undefined
    };

    // Close the dialog immediately for better UX
    onOpenChange(false);
    form.reset();

    // Then trigger the mutation
    if (isEditing && studentType) {
      updateStudentTypeMutation.mutate({
        studentTypeId: studentType.studentTypeId,
        ...updatedValues,
      });
    } else {
      createStudentTypeMutation.mutate(updatedValues);
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
                      placeholder="最大学年数を入力してください（任意）"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
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
                      value={field.value ?? ""} // Ensure value is never null
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>表示順序</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="例: 1, 2, 3..."
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? undefined : value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    数値が小さいほど上に表示されます。空欄の場合は自動的に最後に配置されます。
                  </FormDescription>
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
