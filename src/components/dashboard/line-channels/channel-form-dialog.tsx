"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";
import * as React from "react";
import { Eye, EyeOff, BadgeCheck, CheckCircle, XCircle, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useBranches } from "@/hooks/useBranchQuery";
import { SearchableMultiSelect } from "@/components/admin-schedule/searchable-multi-select";
import { Separator } from "@/components/ui/separator";

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
  
  const { data: branchesData, isLoading: isBranchesLoading } = useBranches({
    limit: 100,
  });
  const branches = branchesData?.data || [];

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
    branchIds: z.array(z.string()).optional(),
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
      branchIds: channel?.branches?.map(b => b.branchId) || [],
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
        branchIds: channel.branches?.map(b => b.branchId) || [],
      });
    } else {
      form.reset({
        name: "",
        description: "",
        channelAccessToken: "",
        channelSecret: "",
        isActive: true,
        branchIds: [],
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
          branchIds: values.branchIds,
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
          branchIds: values.branchIds,
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
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? "LINEチャンネルを編集" : "新規LINEチャンネル"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "チャンネル情報を更新します。"
              : "新しいLINEチャンネルを作成します。"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form className="space-y-4" autoComplete="off">
            {/* Autofill blockers (some browsers ignore autocomplete=off). Keep visually hidden. */}
            <input type="text" name="fake-username" autoComplete="username" style={{ display: 'none' }} aria-hidden="true" />
            <input type="password" name="fake-password" autoComplete="new-password" style={{ display: 'none' }} aria-hidden="true" />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>チャンネル名</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} name="line-channel-name" />
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
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </FormControl>
                  <FormDescription>
                    このチャンネルの用途や特徴を記入してください
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        autoComplete="new-password"
                        name="line-channel-access-token"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
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
                        autoComplete="new-password"
                        name="line-channel-secret"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
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

            {/* Branch Assignment Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  校舎配属
                </h3>
                <Separator className="flex-1" />
              </div>

              <FormField
                control={form.control}
                name="branchIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      割り当て校舎（複数選択可）
                    </FormLabel>
                    <FormControl>
                      <SearchableMultiSelect
                        value={field.value || []}
                        onValueChange={field.onChange}
                        items={branches.map((branch) => ({
                          value: branch.branchId,
                          label: branch.name,
                        }))}
                        placeholder="校舎を選択してください"
                        searchPlaceholder="校舎名を検索..."
                        emptyMessage="該当する校舎が見つかりません"
                        loading={isBranchesLoading}
                        disabled={isBranchesLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      このチャンネルを使用する校舎を選択してください。
                      各校舎での講師用・生徒用の設定は「校舎別チャンネル設定」で行います。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show current channel type assignments for editing mode */}
              {isEditing && channel && channel.branches && channel.branches.length > 0 && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <p className="text-sm font-medium">現在のチャンネルタイプ設定:</p>
                  <div className="flex flex-wrap gap-2">
                    {channel.branches.map((branch) => {
                      const isTeacher = branch.channelType === 'TEACHER';
                      return (
                        <div key={branch.id} className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            <Building2 className="mr-1 h-3 w-3" />
                            {branch.branch.name}
                          </Badge>
                          <Badge
                            variant={isTeacher ? "default" : "secondary"}
                            className={`text-xs ${
                              isTeacher
                                ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                                : "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                            }`}
                          >
                            {isTeacher ? "講師" : "生徒"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {!isEditing && (
              <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 space-y-2">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  チャンネルタイプの設定について
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  チャンネルを作成・校舎に割り当てた後、「校舎別チャンネル設定」から各校舎での講師用・生徒用の設定を行ってください。
                </p>
              </div>
            )}
            </form>
          </Form>
        </div>
        <DialogFooter className="flex-shrink-0 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={
              createChannelMutation.isPending ||
              updateChannelMutation.isPending
            }
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={
              createChannelMutation.isPending ||
              updateChannelMutation.isPending
            }
          >
            {isEditing ? "更新" : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
