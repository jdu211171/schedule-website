// next-auth.d.ts
import { UserRole } from "@prisma/client";
import { DefaultSession, DefaultUser } from "next-auth";

/** Extending the default User type to include role */
declare module "next-auth" {
  interface User extends DefaultUser {
    role?: UserRole;
    username?: string;
    userId?: string;
    branches?: { branchId: string; name: string }[];
    selectedBranchId?: string | null;
  }

  interface Session {
    user?: {
      role?: UserRole;
      username?: string;
      userId?: string;
      branches?: { branchId: string; name: string }[];
      selectedBranchId?: string | null;
    } & DefaultSession["user"];
  }
}
