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
  useClassTypeCreate,
  useClassTypeUpdate,
} from "@/hooks/useClassTypeMutation";
import { ClassType } from "@prisma/client";

// Client-side form validation schema
const formSchema = z.object({
  name: z
    .string()
    .min(1, { message: "入力は必須です" })
    .max(100, { message: "100文字以内で入力してください" }),
  notes: z
    .string()
    .max(255, { message: "255文字以内で入力してください" })
    .optional()
    .nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface ClassTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classType?: ClassType | null;
}

export function ClassTypeFormDialog({
  open,
  onOpenChange,
  classType,
}: ClassTypeFormDialogProps) {
  const createClassTypeMutation = useClassTypeCreate();
  const updateClassTypeMutation = useClassTypeUpdate();
  const isEditing = !!classType;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: classType?.name || "",
      notes: classType?.notes || "",
    },
  });

  useEffect(() => {
    if (classType) {
      form.reset({
        name: classType.name || "",
        notes: classType.notes || "", // Use empty string when null
      });
    } else {
      form.reset({
        name: "",
        notes: "",
      });
    }
  }, [classType, form]);

  function onSubmit(values: FormValues) {
    // Ensure the notes field is explicitly included, even if empty
    const updatedValues = {
      ...values,
      notes: values.notes ?? "", // Ensure notes is at least an empty string, not undefined
    };

    // Close the dialog immediately for better UX
    onOpenChange(false);
    form.reset();

    // Then trigger the mutation
    if (isEditing && classType) {
      updateClassTypeMutation.mutate({
        classTypeId: classType.classTypeId,
        ...updatedValues,
      });
    } else {
      createClassTypeMutation.mutate(updatedValues);
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
            {isEditing ? "授業タイプの編集" : "授業タイプの作成"}
          </DialogTitle>
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
                      placeholder="授業タイプ名を入力してください"
                      {...field}
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
                      placeholder="メモを入力してください（任意）"
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
