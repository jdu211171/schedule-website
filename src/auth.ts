import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./lib/prisma";
import authConfig from "./auth.config";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  ...authConfig,
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
