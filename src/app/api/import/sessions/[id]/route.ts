import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { getImportSession } from "@/lib/import-session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const sess = getImportSession(id);
  if (!sess) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  return NextResponse.json(sess);
}

