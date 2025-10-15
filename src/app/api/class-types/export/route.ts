// src/app/api/class-types/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CSV export handler for class types
export const GET = withRole(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;

    // Optional filters
    const name = searchParams.get("name") || undefined;

    // Fetch class types with optional name filter
    const classTypes = await prisma.classType.findMany({
      where: name
        ? { name: { contains: name, mode: "insensitive" } }
        : undefined,
      include: {
        parent: true,
        children: true,
      },
      orderBy: { order: "asc" },
    });

    // Get visible columns from query params and ensure ID is included
    const rawColumns = searchParams.get("columns")?.split(",") || [
      "id",
      "name",
      "parent",
      "notes",
      "order",
      "childrenCount",
      "visibleInFilters",
    ];
    const visibleColumns = rawColumns.includes("id") ? rawColumns : ["id", ...rawColumns];

    // Column headers mapping
    const columnHeaders: Record<string, string> = {
      id: "ID",
      name: "授業タイプ名",
      parent: "親タイプ",
      notes: "備考",
      order: "表示順",
      childrenCount: "子タイプ数",
      visibleInFilters: "フィルター表示",
    };

    // Build CSV header
    const headers = visibleColumns
      .map((col) => columnHeaders[col] || col)
      .join(",");

    // Build CSV rows
    const rows = classTypes.map((classType) => {
      const row = visibleColumns.map((col) => {
        switch (col) {
          case "id":
            return classType.classTypeId || "";
          case "name":
            return classType.name || "";
          case "parent":
            return classType.parent?.name || "";
          case "notes":
            return classType.notes || "";
          case "order":
            return classType.order?.toString() || "";
          case "childrenCount":
            return classType.children.length.toString();
          case "visibleInFilters":
            return (classType as any).visibleInFilters === false ? "false" : "true";
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
        "Content-Disposition": `attachment; filename="class-types_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }
);
