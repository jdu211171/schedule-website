// src/app/api/branches/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CSV export handler for branches
export const GET = withRole(
  ["ADMIN"],
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;

    // Fetch all branches
    const branches = await prisma.branch.findMany({
      include: {
        userBranches: {
          include: {
            user: {
              select: {
                name: true,
                username: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { order: "asc" },
    });

    // Get visible columns from query params
    const visibleColumns = searchParams.get("columns")?.split(",") || [
      "name",
      "notes",
      "userCount",
    ];

    // Column headers mapping
    const columnHeaders: Record<string, string> = {
      name: "校舎名",
      notes: "備考",
      userCount: "ユーザー数",
    };

    // Build CSV header
    const headers = visibleColumns
      .map((col) => columnHeaders[col] || col)
      .join(",");

    // Build CSV rows
    const rows = branches.map((branch) => {
      const row = visibleColumns.map((col) => {
        switch (col) {
          case "name":
            return branch.name || "";
          case "notes":
            return branch.notes || "";
          case "userCount":
            return branch.userBranches.length.toString();
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
        "Content-Disposition": `attachment; filename="branches_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }
);