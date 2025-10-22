"use server";

import { auth, signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function requireAuth() {
  const session = await auth();

  if (!session) {
    throw new Error("You must be logged in to access this resource.");
  }

  return session;
}

export async function loginUser(identifier: string, password: string) {
  try {
    await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          throw new Error("ログインIDまたはパスワードが正しくありません");
        default:
          throw new Error("ログインに失敗しました");
      }
    }
    throw error;
  }
}
