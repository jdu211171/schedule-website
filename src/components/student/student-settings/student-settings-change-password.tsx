"use client";
import { Button } from "@/components/ui/button";
import type React from "react";

import { Input } from "@/components/ui/input";
import { fetcher } from "@/lib/fetcher";
import { Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const StudentSettingsChangePassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showCurrentPassword, setShowCurrentPassword] =
    useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const passowrds = {
      currentPassword: formData.get("currentPassword") as string,
      newPassword: formData.get("newPassword") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    if (passowrds.newPassword !== passowrds.confirmPassword) {
      toast.error("パスワードが一致しません！");
      setIsLoading(false);
      return;
    }
    try {
      const result: { message: string } = await fetcher(
        "/api/students/me/password",
        {
          method: "PATCH",
          body: JSON.stringify(passowrds),
          credentials: "include",
        }
      );

      toast.success(result.message);
      form.reset();        } catch (err: any) {
      console.log("Error on changing password service:", err);
      if (err.info && err.info.error) {
        toast.error(err.info.error as string);
      } else {
        toast.error("エラーが発生しました！");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            パスワードを変更
          </CardTitle>
          <CardDescription>
            アカウントのセキュリティを保つために、パスワードを更新してください。強力なパスワードを使用することをお勧めします。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  現在のパスワード <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    placeholder="現在のパスワードを入力"
                    name="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showCurrentPassword ? "パスワードを隠す" : "パスワードを表示"}
                    </span>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  新しいパスワード <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    placeholder="新しいパスワードを入力"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showNewPassword ? "パスワードを隠す" : "パスワードを表示"}
                    </span>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  新しいパスワード（確認） <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    placeholder="新しいパスワードを再入力"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showConfirmPassword ? "パスワードを隠す" : "パスワードを表示"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            <Button
              className="w-full sm:w-auto"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  パスワードを更新中...
                </>
              ) : (
                "パスワードを更新"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>パスワードの要件</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• 8文字以上の長さ</li>
            <li>• 大文字と小文字の両方を含む</li>
            <li>• 数字を少なくとも1つ含む</li>
            <li>• 特殊文字を少なくとも1つ含む</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentSettingsChangePassword;
