// auth.config.ts
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

const protectedRoots = ["/dashboard", "/teacher", "/student"] as const;

export default {
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Allow linking OAuth accounts to existing accounts with same email
      // This allows users who signed up with credentials to later login with Google
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        usernameOrEmail: {
          placeholder: "Username or Email",
          name: "usernameOrEmail",
          type: "text",
        },
        password: {
          placeholder: "Password",
          name: "password",
          type: "password",
        },
      },
      authorize: async (creds) => {
        if (!creds?.usernameOrEmail || !creds?.password)
          throw new Error("Missing username/email or password");

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: creds.usernameOrEmail },
              { username: creds.usernameOrEmail },
            ],
          },
          include: {
            teacher: true,
            student: true,
            branches: {
              include: {
                branch: {
                  select: {
                    branchId: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        if (!user) throw new Error("Invalid credentials");

        const ok = ["TEACHER", "STUDENT"].includes(user.role)
          ? creds.password === user.passwordHash
          : await bcrypt.compare(
            creds.password as string,
            user.passwordHash as string
          );

        if (!ok) throw new Error("Invalid credentials");

        // For ADMIN users, fetch all branches
        let userBranches;
        if (user.role === 'ADMIN') {
          const allBranches = await prisma.branch.findMany({
            select: {
              branchId: true,
              name: true,
            },
            orderBy: { name: 'asc' }
          });
          userBranches = allBranches;
        } else {
          // For non-ADMIN, use branches associated with the user
          userBranches =
            user.branches?.map((ub) => ({
              branchId: ub.branch.branchId,
              name: ub.branch.name,
            })) || [];
        }

        // Determine initial selectedBranchId more intelligently
        let selectedBranchId: string | null = null;
        if (userBranches.length > 0) {
          // First priority: Check if user has a stored preference (this would need to be implemented in DB if needed)
          // Second priority: Default to first branch alphabetically
          selectedBranchId = userBranches[0].branchId;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          image: user.image,
          name: user.name,
          username: user.username ?? "",
          userId: user.teacher?.teacherId || user.student?.studentId || "",
          branches: userBranches,
          selectedBranchId,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google OAuth, only allow existing users to sign in
      if (account?.provider === "google") {
        console.log("🔍 Google OAuth attempt:", {
          email: user.email,
          name: user.name,
        });

        if (!user.email) {
          console.log("❌ No email provided");
          return false;
        }

        let existingUser;
        try {
          // Check if user exists in database
          existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: {
              teacher: true,
              student: true,
              branches: {
                include: {
                  branch: {
                    select: {
                      branchId: true,
                      name: true,
                    },
                  },
                },
              },
            },
          });

          console.log("🔍 Database lookup result:", {
            found: !!existingUser,
            email: user.email,
            role: existingUser?.role,
          });

          if (!existingUser) {
            console.log("❌ User not found in database:", user.email);
            // User doesn't exist, prevent signup
            return false;
          }
        } catch (error) {
          console.error("❌ Database error during Google OAuth:", error);
          return false;
        }

        console.log("✅ User found, setting up user data");

        // User exists, allow sign in and attach additional data
        // For ADMIN users, fetch all branches
        let userBranches;
        if (existingUser.role === 'ADMIN') {
          const allBranches = await prisma.branch.findMany({
            select: {
              branchId: true,
              name: true,
            },
            orderBy: { name: 'asc' }
          });
          userBranches = allBranches;
        } else {
          // For non-ADMIN, use branches associated with the user
          userBranches =
            existingUser.branches?.map((ub: any) => ({
              branchId: ub.branch.branchId,
              name: ub.branch.name,
            })) || [];
        }

        // Determine initial selectedBranchId
        let selectedBranchId: string | null = null;
        if (userBranches.length > 0) {
          selectedBranchId = userBranches[0].branchId;
        }

        // Attach additional user data
        user.role = existingUser.role;
        user.username = existingUser.username ?? "";
        user.userId = existingUser.teacher?.teacherId || existingUser.student?.studentId || "";
        user.branches = userBranches;
        user.selectedBranchId = selectedBranchId;

        console.log("✅ Google OAuth success:", {
          role: existingUser.role,
          branchCount: userBranches.length,
        });

        return true;
      }

      // For other providers (credentials), allow normal flow
      return true;
    },
    authorized({ request, auth }) {
      const { pathname, origin } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user);
      const role = auth?.user?.role as UserRole | undefined;

      /* 1.  Not logged in and trying to view a protected area → send to login */
      if (
        !isLoggedIn &&
        protectedRoots.some((root) => pathname.startsWith(root))
      ) {
        return NextResponse.redirect(`${origin}/auth/login`);
      }

      /* 2.  Already logged in & visiting /auth/* → kick them to their home */
      if (isLoggedIn && pathname.startsWith("/auth")) {
        return NextResponse.redirect(`${origin}${homeFor(role)}`);
      }

      /* 3.  Role-based gating */
      if (isLoggedIn) {
        if (pathname.startsWith("/dashboard") && role !== "ADMIN")
          return NextResponse.redirect(`${origin}${homeFor(role)}`);

        if (pathname.startsWith("/teacher") && role !== "TEACHER")
          return NextResponse.redirect(`${origin}${homeFor(role)}`);

        if (pathname.startsWith("/student") && role !== "STUDENT")
          return NextResponse.redirect(`${origin}${homeFor(role)}`);

        if (pathname.startsWith("/dashboard") && role !== "STAFF")
          return NextResponse.redirect(`${origin}${homeFor(role)}`);
      }

      /* 4.  Everything else → allow */
      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.image = user.image;
        token.username = user.username;
        token.userId = user.userId;
        token.branches = user.branches;
        token.selectedBranchId = user.selectedBranchId;
      }

      // Handle session updates (when update() is called from frontend)
      if (trigger === "update" && session?.user?.selectedBranchId !== undefined) {
        token.selectedBranchId = session.user.selectedBranchId;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.image = token.image as string;
        session.user.username = token.username as string;
        session.user.userId = token.userId as string;
        session.user.branches = token.branches as {
          branchId: string;
          name: string;
        }[];
        session.user.selectedBranchId = token.selectedBranchId as string | null;
      }
      return session;
    },
  },

  pages: { signIn: "/auth/login" },
} satisfies NextAuthConfig;

function homeFor(role?: UserRole) {
  switch (role) {
    case "ADMIN":
      return "/dashboard";
    case "TEACHER":
      return "/teacher";
    case "STUDENT":
      return "/student";
    case "STAFF":
      return "/dashboard";
    default:
      return "/";
  }
}
