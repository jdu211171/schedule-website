import { DefaultSession, DefaultUser } from "next-auth";

/** Extending the default User type to include role */
declare module "next-auth" {
    interface User extends DefaultUser {
        role?: "ADMIN" | "TEACHER" | "STUDENT";
    }

    interface Session {
        user?: {
            id: string;
            role?: "ADMIN" | "TEACHER" | "STUDENT";
            email?: string;
            name?: string;
            image?: string;
        } & DefaultSession["user"];
    }
}