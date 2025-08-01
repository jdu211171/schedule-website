"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";
import * as React from "react";
import { Eye, EyeOff, BadgeCheck, CheckCircle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import { useLineChannelCreate, useLineChannelUpdate, useLineChannelTest } from "@/hooks/useLineChannelMutation";
import { LineChannelResponse } from "@/types/line-channel";
import { lineChannelCreateSchema, lineChannelUpdateSchema } from "@/schemas/line-channel.schema";

interface ChannelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel?: LineChannelResponse | null;
}

export function ChannelFormDialog({
  open,
  onOpenChange,
  channel,
}: ChannelFormDialogProps) {
  const createChannelMutation = useLineChannelCreate();
  const updateChannelMutation = useLineChannelUpdate();
  const testChannelMutation = useLineChannelTest();
  const isEditing = !!channel;

  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tested: boolean;
  } | null>(null);

  // Form schema - always use the create schema with all fields
  const formSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(255).optional().nullable(),
    channelAccessToken: z.string().optional(),
    channelSecret: z.string().optional(),
    isActive: z.boolean().default(true),
  });

  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: channel?.name || "",
      description: channel?.description || "",
      channelAccessToken: "",
      channelSecret: "",
      isActive: channel?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (channel) {
      form.reset({
        name: channel.name || "",
        description: channel.description || "",
        channelAccessToken: "",
        channelSecret: "",
        isActive: channel.isActive ?? true,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        channelAccessToken: "",
        channelSecret: "",
        isActive: true,
      });
    }
  }, [channel, form]);

  async function onSubmit(values: FormData) {
    try {
      if (isEditing && channel) {
        // Prepare update data, filtering out empty credentials
        const updateData = {
          channelId: channel.id,
          name: values.name,
          description: values.description,
          isActive: values.isActive,
          ...(values.channelAccessToken && values.channelAccessToken.trim().length > 0
            ? { channelAccessToken: values.channelAccessToken }
            : {}),
          ...(values.channelSecret && values.channelSecret.trim().length > 0
            ? { channelSecret: values.channelSecret }
            : {}),
        };

        // Update channel with branch assignments in a single request
        await updateChannelMutation.mutateAsync(updateData);
      } else {
        // For create, ensure required fields are present
        if (!values.channelAccessToken || !values.channelSecret) {
          form.setError("channelAccessToken", { message: "チャンネルアクセストークンは必須です" });
          form.setError("channelSecret", { message: "チャンネルシークレットは必須です" });
          return;
        }

        await createChannelMutation.mutateAsync({
          name: values.name,
          description: values.description,
          channelAccessToken: values.channelAccessToken,
          channelSecret: values.channelSecret,
          isActive: values.isActive,
        });
      }

      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error is handled by the mutation
    }
  }


  const handleTestCredentials = async () => {
    const accessToken = form.getValues('channelAccessToken');
    const secret = form.getValues('channelSecret');

    if (!accessToken || !secret) {
      form.setError('channelAccessToken', {
        message: 'テストするにはトークンを入力してください'
      });
      form.setError('channelSecret', {
        message: 'テストするにはシークレットを入力してください'
      });
      return;
    }

    try {
      const result = await testChannelMutation.mutateAsync({
        channelAccessToken: accessToken,
        channelSecret: secret,
      });

      setTestResult({
        success: result.success,
        message: result.message,
        tested: true,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: '認証情報のテストに失敗しました',
        tested: true,
      });
    }
  };

  // Reset test result when credentials change
  React.useEffect(() => {
    setTestResult(null);
  }, [form.watch('channelAccessToken'), form.watch('channelSecret')]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "LINEチャンネルを編集" : "新規LINEチャンネル"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "チャンネル情報を更新します。"
              : "新しいLINEチャンネルを作成します。"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>チャンネル名</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                      {...field}
                      value={field.value || ""}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormDescription>
                    このチャンネルの用途や特徴を記入してください
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(!isEditing || form.watch("channelAccessToken")) && (
              <FormField
                control={form.control}
                name="channelAccessToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>チャンネルアクセストークン</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showAccessToken ? "text" : "password"}
                          placeholder={isEditing ? "新しいトークンを入力（変更する場合）" : ""}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowAccessToken(!showAccessToken)}
                        >
                          {showAccessToken ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    {isEditing && (
                      <FormDescription>
                        現在のトークン: {channel?.channelAccessTokenPreview}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(!isEditing || form.watch("channelSecret")) && (
              <FormField
                control={form.control}
                name="channelSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>チャンネルシークレット</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showSecret ? "text" : "password"}
                          placeholder={isEditing ? "新しいシークレットを入力（変更する場合）" : ""}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowSecret(!showSecret)}
                        >
                          {showSecret ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    {isEditing && (
                      <FormDescription>
                        現在のシークレット: {channel?.channelSecretPreview}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Test Credentials Button and Results */}
            {!isEditing && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestCredentials}
                  disabled={testChannelMutation.isPending}
                  className="w-full"
                >
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  {testChannelMutation.isPending ? "テスト中..." : "認証情報をテスト"}
                </Button>

                {testResult && testResult.tested && (
                  <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                    testResult.success
                      ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>有効化</FormLabel>
                    <FormDescription>
                      このチャンネルを通知送信に使用できるようにします
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!isEditing && (
              <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 space-y-2">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  チャンネル作成後の設定について
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  チャンネルを作成した後、各校舎の設定から講師用・生徒用として割り当ててください。
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={
                  createChannelMutation.isPending ||
                  updateChannelMutation.isPending
                }
              >
                {isEditing ? "更新" : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
