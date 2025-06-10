"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { loginUser } from "@/actions/auth-actions";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";

const loginSchema = z.object({
  usernameOrEmail: z
    .string()
    .nonempty("ログインIDまたはメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上である必要があります"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      usernameOrEmail: "",
      password: "",
    },
  });

  // Check for error parameters in URL on component mount
  useEffect(() => {
    const url = new URL(window.location.href);
    const error = url.searchParams.get("error");

    if (error) {
      console.log("URL error parameter:", error);

      if (error === "AccessDenied") {
        toast.error("ログイン失敗", {
          description:
            "このGoogleアカウントは登録されていません。管理者にお問い合わせください。",
        });
      } else if (error === "OAuthAccountNotLinked") {
        toast.error("アカウント連携エラー", {
          description:
            "このメールアドレスは既に別の方法で登録されています。パスワードでログインするか、管理者にお問い合わせください。",
        });
      } else if (error === "SessionRequired") {
        // Don't show error for SessionRequired, it's normal
      } else {
        toast.error("ログイン失敗", {
          description: `エラーが発生しました: ${error}`,
        });
      }

      // Clean up URL
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) =>
      await loginUser(values.usernameOrEmail, values.password),
    onSuccess: () => {
      toast.success("ログイン成功", {
        description: "お帰りなさい！",
      });
      router.push("/");
    },
    onError: (error) => {
      toast.error("ログイン失敗", {
        description: error.message,
      });
    },
  });

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);

      // Clear any existing errors first
      const url = new URL(window.location.href);
      if (url.searchParams.get("error")) {
        url.searchParams.delete("error");
        window.history.replaceState({}, "", url.toString());
      }

      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "/",
      });

      console.log("Google signIn result:", result);

      if (result?.error) {
        console.log("Google sign in error:", result.error);

        if (result.error === "AccessDenied") {
          toast.error("ログイン失敗", {
            description:
              "このGoogleアカウントは登録されていません。管理者にお問い合わせください。",
          });
        } else if (result.error === "OAuthAccountNotLinked") {
          toast.error("アカウント連携エラー", {
            description:
              "このメールアドレスは既に別の方法で登録されています。パスワードでログインするか、管理者にお問い合わせください。",
          });
        } else {
          toast.error("ログイン失敗", {
            description: "予期せぬエラーが発生しました: " + result.error,
          });
        }
      } else if (result?.url) {
        toast.success("ログイン成功", {
          description: "お帰りなさい！",
        });
        // Use router.push instead of direct redirect
        setTimeout(() => {
          router.push(result.url ?? "/");
        }, 1000); // Small delay to show the toast
      } else if (result?.ok) {
        toast.success("ログイン成功", {
          description: "お帰りなさい！",
        });
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        // If we get here, something unexpected happened
        console.log("Unexpected result:", result);
        toast.info("処理中...", {
          description: "ログイン処理を確認しています...",
        });

        // Check if we're actually logged in
        setTimeout(async () => {
          const response = await fetch("/api/auth/session");
          const session = await response.json();
          if (session?.user) {
            toast.success("ログイン成功", {
              description: "お帰りなさい！",
            });
            router.push("/");
          } else {
            toast.error("ログイン失敗", {
              description: "ログインが完了しませんでした。",
            });
          }
        }, 2000);
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      toast.error("ログイン失敗", {
        description: "予期せぬエラーが発生しました。",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">アカウントにログイン</h1>
        <p className="text-muted-foreground text-sm text-balance">
          ログインIDまたはメールアドレスを入力してアカウントにログインしてください
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
          <FormField
            control={form.control}
            name="usernameOrEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ログインIDまたはメールアドレス</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="ログインIDまたはメールアドレス"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>パスワード</FormLabel>
                  <a
                    href="#"
                    className="text-sm underline-offset-4 hover:underline"
                  >
                    パスワードをお忘れですか？
                  </a>
                </div>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "ログイン中..." : "ログイン"}
          </Button>
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">
              または以下で続行
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {isGoogleLoading ? "ログイン中..." : "Googleでログイン"}
          </Button>
        </form>
      </Form>
      <div className="text-center text-sm">
        アカウントをお持ちではありませんか？{" "}
        <a href="#" className="underline underline-offset-4">
          管理者にお問い合わせください
        </a>
      </div>
    </div>
  );
}
