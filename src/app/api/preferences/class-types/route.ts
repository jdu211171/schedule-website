// src/app/api/preferences/class-types/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userHiddenClassTypesSchema } from "@/schemas/user-preferences.schema";
import { getUserHiddenClassTypeIds, setUserHiddenClassTypeIds } from "@/services/user-preferences";

// GET: return current user's hidden class type IDs
async function resolveUserId(session: any): Promise<string | null> {
  const direct = session?.user?.id as string | undefined;
  if (direct) return direct;
  const username = session?.user?.username as string | undefined;
  const email = session?.user?.email as string | undefined;
  try {
    if (username) {
      const u = await prisma.user.findUnique({ where: { username }, select: { id: true } });
      if (u?.id) return u.id;
    }
    if (email) {
      const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (u?.id) return u.id;
    }
  } catch {}
  return null;
}

export const GET = withRole(["ADMIN", "STAFF", "TEACHER", "STUDENT"], async (_req: NextRequest, session) => {
  try {
    const userId = await resolveUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const hidden = await getUserHiddenClassTypeIds(userId);
    return NextResponse.json({ hiddenClassTypeIds: hidden });
  } catch (error) {
    console.error("Error fetching hidden class types:", error);
    return NextResponse.json({ error: "Failed to load preferences", detail: String(error) }, { status: 500 });
  }
});

// PUT: replace current user's hidden class type IDs
export const PUT = withRole(["ADMIN", "STAFF", "TEACHER", "STUDENT"], async (req: NextRequest, session) => {
  try {
    const body = await req.json();
    const parsed = userHiddenClassTypesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const userId = await resolveUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const updated = await setUserHiddenClassTypeIds(userId, parsed.data.hiddenClassTypeIds);
    return NextResponse.json({ hiddenClassTypeIds: updated });
  } catch (error) {
    console.error("Error updating hidden class types:", error);
    return NextResponse.json({ error: "Failed to update preferences", detail: String(error) }, { status: 500 });
  }
});
