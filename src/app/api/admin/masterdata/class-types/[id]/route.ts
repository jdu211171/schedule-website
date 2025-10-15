// src/app/api/admin/masterdata/class-types/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH – Admin-only: update class type fields (visibleInFilters)
export const PATCH = withRole(["ADMIN"], async (req: NextRequest) => {
  const { pathname } = new URL(req.url);
  const id = pathname.split("/").pop();
  if (!id) return NextResponse.json({ error: "Invalid classType id" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: { visibleInFilters?: boolean } = {};
  if (body && typeof body === "object" && "visibleInFilters" in body) {
    const v = (body as Record<string, unknown>).visibleInFilters;
    if (typeof v === "boolean") data.visibleInFilters = v;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  try {
    const updated = await prisma.classType.update({
      where: { classTypeId: id },
      data,
      select: { classTypeId: true, visibleInFilters: true },
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const err = e as { code?: string } | undefined;
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "ClassType not found" }, { status: 404 });
    }
    console.error("Failed to update class type", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
