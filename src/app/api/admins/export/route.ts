// src/app/api/admins/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CSV export handler for admins
export const GET = withRole(["ADMIN"], async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;

  // Fetch all admins
  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
    },
    include: {
      branches: {
        include: {
          branch: true,
        },
      },
    },
    orderBy: { order: "asc" },
  });

  // Get visible columns from query params and ensure ID is included
  const rawColumns = searchParams.get("columns")?.split(",") || [
    "id",
    "name",
    "email",
    "username",
    "isRestrictedAdmin",
    "branches",
  ];
  const visibleColumns = rawColumns.includes("id")
    ? rawColumns
    : ["id", ...rawColumns];

  // Column headers mapping
  const columnHeaders: Record<string, string> = {
    id: "ID",
    name: "名前",
    email: "メールアドレス",
    username: "ユーザー名",
    isRestrictedAdmin: "制限付き管理者",
    branches: "所属校舎",
  };

  // Build CSV header
  const headers = visibleColumns
    .map((col) => columnHeaders[col] || col)
    .join(",");

  // Build CSV rows
  const rows = admins.map((admin) => {
    const row = visibleColumns.map((col) => {
      switch (col) {
        case "id":
          return admin.id || "";
        case "name":
          return admin.name || "";
        case "email":
          return admin.email || "";
        case "username":
          return admin.username || "";
        case "isRestrictedAdmin":
          return admin.isRestrictedAdmin ? "はい" : "いいえ";
        case "branches":
          return admin.branches.map((ub) => ub.branch.name).join("、") || "";
        default:
          return "";
      }
    });

    // Escape CSV values
    return row
      .map((value) => {
        // If value contains comma, newline, or quotes, wrap in quotes
        if (
          value.includes(",") ||
          value.includes("\n") ||
          value.includes('"')
        ) {
          // Escape quotes by doubling them
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",");
  });

  // Combine header and rows
  const csv = [headers, ...rows].join("\n");

  // Add BOM for Excel to properly display UTF-8
  const bom = "\uFEFF";
  const csvContent = bom + csv;

  // Return CSV response
  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="admins_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
});
