import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { getImportSession } from "@/lib/import-session";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[parts.length - 1];
  const sess = getImportSession(id);
  if (!sess) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  return NextResponse.json(sess);
}
