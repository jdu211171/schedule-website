"use client";

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
  useEvaluationCreate,
  useEvaluationUpdate,
} from "@/hooks/useEvaluationMutation";
import { Evaluation } from "@prisma/client";
import { CreateEvaluationSchema } from "@/schemas/evaluation.schema";

interface EvaluationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation?: Evaluation | null;
}

export function EvaluationFormDialog({
  open,
  onOpenChange,
  evaluation,
}: EvaluationFormDialogProps) {
  const createEvaluationMutation = useEvaluationCreate();
  const updateEvaluationMutation = useEvaluationUpdate();

  const isEditing = !!evaluation;

  const formSchema = CreateEvaluationSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: evaluation?.name || "",
      score: evaluation?.score ?? undefined,
      notes: evaluation?.notes || "",
    },
  });

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
    if (isEditing && evaluation) {
      updateEvaluationMutation.mutate({
        evaluationId: evaluation.evaluationId,
        ...updatedValues,
      });
    } else {
      createEvaluationMutation.mutate(updatedValues);
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
          <DialogTitle>{isEditing ? "評価の編集" : "評価の作成"}</DialogTitle>
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
                    <Input placeholder="評価の名前を入力" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>スコア</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="スコアを入力"
                      value={field.value === undefined ? "" : field.value}
                      onChange={(e) => {
                        const value =
                          e.target.value === ""
                            ? undefined
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
              <Button type="submit">
                {isEditing ? "変更を保存" : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
