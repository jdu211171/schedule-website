import { UserRole } from "@prisma/client";
import { DefaultSession, DefaultUser } from "next-auth";

/** Extending the default User type to include role */
declare module "next-auth" {
  interface User extends DefaultUser {
    role?: UserRole;
    username?: string;
    userId?: string;
  }

  interface Session {
    user?: {
      role?: UserRole;
      username?: string;
      userId?: string;
    } & DefaultSession["user"];
  }
}
