"use client";
import type React from "react";
import { Button } from "@/components/ui/button";
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

const TeacherSettingsChangePassword: React.FC = () => {
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

    const passwords = {
      currentPassword: formData.get("currentPassword") as string,
      newPassword: formData.get("newPassword") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("パスワードが一致しません！");
      setIsLoading(false);
      return;
    }

    try {
      const result: { message: string } = await fetcher(
        "/api/teachers/me/password",
        {
          method: "PATCH",
          body: JSON.stringify(passwords),
          credentials: "include",
        }
      );

      toast.success(result.message);
      form.reset();
    } catch (err: any) {
      console.log("Error on changing password service:", err);
      if (err.info && err.info.error) {
        toast.error(err.info.error as string);
      } else {
        toast.error("パスワードの変更に失敗しました");
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
            パスワードの変更
          </CardTitle>
          <CardDescription>
            セキュリティのため、現在のパスワードと新しいパスワードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Current Password */}
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
                    {showCurrentPassword
                      ? "パスワードを隠す"
                      : "パスワードを表示"}
                  </span>
                </Button>
              </div>
            </div>

            {/* New Password */}
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

            {/* Confirm Password */}
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
                    {showConfirmPassword
                      ? "パスワードを隠す"
                      : "パスワードを表示"}
                  </span>
                </Button>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                パスワードを更新
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherSettingsChangePassword;
