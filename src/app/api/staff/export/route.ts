// src/app/api/staff/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CSV export handler for staff
export const GET = withRole(
  ["ADMIN"],
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;

    // Fetch all staff
    const staff = await prisma.user.findMany({
      where: {
        role: "STAFF",
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
      "branches",
    ];
    const visibleColumns = rawColumns.includes("id") ? rawColumns : ["id", ...rawColumns];

    // Column headers mapping
    const columnHeaders: Record<string, string> = {
      id: "ID",
      name: "名前",
      email: "メールアドレス",
      username: "ユーザー名",
      branches: "所属校舎",
    };

    // Build CSV header
    const headers = visibleColumns
      .map((col) => columnHeaders[col] || col)
      .join(",");

    // Build CSV rows
    const rows = staff.map((staffMember) => {
      const row = visibleColumns.map((col) => {
        switch (col) {
          case "id":
            return staffMember.id || "";
          case "name":
            return staffMember.name || "";
          case "email":
            return staffMember.email || "";
          case "username":
            return staffMember.username || "";
          case "branches":
            return staffMember.branches.map((ub) => ub.branch.name).join("、") || "";
          default:
            return "";
        }
      });

      // Escape CSV values
      return row.map((value) => {
        // If value contains comma, newline, or quotes, wrap in quotes
        if (value.includes(",") || value.includes("\n") || value.includes('"')) {
          // Escape quotes by doubling them
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",");
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
        "Content-Disposition": `attachment; filename="staff_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }
);
