"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { passwordUpdateSchema, type PasswordUpdateValues } from "@/schemas/password.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { usePasswordChange } from "@/hooks/usePasswordChange";

type Props = {
  onSuccess?: () => void;
};

export function PasswordChangeForm({ onSuccess }: Props) {
  const form = useForm<PasswordUpdateValues>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const mutation = usePasswordChange();

  async function onSubmit(values: PasswordUpdateValues) {
    await mutation.mutateAsync(values);
    if (onSuccess) onSuccess();
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>現在のパスワード</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>新しいパスワード</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>新しいパスワード（確認）</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "更新中..." : "パスワードを更新"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

