"use server"

import { auth, signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function requireAuth() {
  const session = await auth();

  if (!session) {
    throw new Error("You must be logged in to access this resource.");
  }

  return session;
}

export async function loginUser(usernameOrEmail: string, password: string) {
  "use client";
  try {
    const res = await signIn("credentials", { usernameOrEmail, password, redirect: false, });
    console.log("Login response:", res);
  } catch (error) {
    if (error instanceof AuthError) {
      console.error("Authentication error:", error.message);
      throw new Error("Credentials are invalid");
    }

    console.error("Error logging in:", error);
    throw new Error("An error occurred while logging in");
  }
}
