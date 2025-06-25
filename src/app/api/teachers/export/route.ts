// src/app/api/teachers/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teacherFilterSchema } from "@/schemas/teacher.schema";

// CSV export handler for teachers
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, selectedBranchId) => {
    const searchParams = request.nextUrl.searchParams;
    const filters = teacherFilterSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10000, // Large limit for export
      name: searchParams.get("name") || undefined,
      status: searchParams.get("status")?.split(",")[0] || undefined, // Take first status for API
    });

    const { name, status } = filters;

    // Get additional filters from query params
    const statusList = searchParams.get("status")?.split(",") || [];
    const branchList = searchParams.get("branch")?.split(",") || [];
    const subjectList = searchParams.get("subject")?.split(",") || [];
    const lineConnectionList = searchParams.get("lineConnection")?.split(",") || [];

    // Build where clause
    const where: any = {
      user: {
        branches: selectedBranchId
          ? { some: { branchId: selectedBranchId } }
          : undefined,
      },
    };

    if (name) {
      where.OR = [
        { name: { contains: name, mode: "insensitive" } },
        { kanaName: { contains: name, mode: "insensitive" } },
      ];
    }

    // Only apply single status filter to DB query if exactly one status is selected
    if (status && statusList.length === 1) {
      where.status = status;
    }

    // Fetch teachers with all related data
    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        user: {
          include: {
            branches: {
              include: {
                branch: true,
              },
            },
            subjectPreferences: {
              include: {
                subject: true,
                subjectType: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Apply client-side filters (same logic as in the table component)
    let filteredTeachers = teachers;

    // Filter by multiple statuses if needed
    if (statusList.length > 1) {
      const statusSet = new Set(statusList);
      filteredTeachers = filteredTeachers.filter(teacher =>
        statusSet.has(teacher.status || "ACTIVE")
      );
    }

    // Filter by branches
    if (branchList.length > 0) {
      const branchSet = new Set(branchList);
      filteredTeachers = filteredTeachers.filter(teacher =>
        teacher.user?.branches?.some((b: any) => branchSet.has(b.branch.name))
      );
    }

    // Filter by subjects
    if (subjectList.length > 0) {
      const subjectSet = new Set(subjectList);
      filteredTeachers = filteredTeachers.filter(teacher => {
        if (!teacher.user?.subjectPreferences) return false;

        return teacher.user.subjectPreferences.some((pref: any) =>
          subjectSet.has(pref.subject.name)
        );
      });
    }

    // Filter by LINE connection status
    if (lineConnectionList.length > 0) {
      const lineConnectionSet = new Set(lineConnectionList);
      filteredTeachers = filteredTeachers.filter(teacher => {
        const hasLine = !!teacher.lineId;
        const notificationsEnabled = teacher.lineNotificationsEnabled ?? true;

        let connectionStatus: string;
        if (!hasLine) {
          connectionStatus = "not_connected";
        } else if (notificationsEnabled) {
          connectionStatus = "connected_enabled";
        } else {
          connectionStatus = "connected_disabled";
        }

        return lineConnectionSet.has(connectionStatus);
      });
    }

    // Get visible columns from query params
    const visibleColumns = searchParams.get("columns")?.split(",") || [
      "name",
      "kanaName",
      "status",
      "username",
      "email",
      "branches",
      "subjectPreferences",
    ];

    // Filter out LINE-related fields for security/privacy
    const allowedColumns = visibleColumns.filter(col =>
      !["lineId", "lineConnection", "lineNotificationsEnabled"].includes(col)
    );

    // Column headers mapping
    const columnHeaders: Record<string, string> = {
      name: "名前",
      kanaName: "カナ",
      status: "ステータス",
      username: "ユーザー名",
      email: "メールアドレス",
      password: "パスワード",
      branches: "校舎",
      subjectPreferences: "担当科目",
    };

    // Status labels
    const statusLabels: Record<string, string> = {
      ACTIVE: "在籍",
      SICK: "休会",
      PERMANENTLY_LEFT: "退会",
    };

    // Build CSV header
    const headers = allowedColumns
      .map((col) => columnHeaders[col] || col)
      .join(",");

    // Build CSV rows - use filtered teachers
    const rows = filteredTeachers.map((teacher) => {
      const row = allowedColumns.map((col) => {
        switch (col) {
          case "name":
            return teacher.name || "";
          case "kanaName":
            return teacher.kanaName || "";
          case "status":
            return statusLabels[teacher.status || "ACTIVE"] || teacher.status || "";
          case "username":
            return teacher.user?.username || "";
          case "email":
            return teacher.user?.email || "";
          case "password":
            // Don't export passwords for security
            return "";
          case "branches":
            return teacher.user?.branches
              ?.map((b: any) => b.branch.name)
              .join("; ") || "";
          case "subjectPreferences":
            return teacher.user?.subjectPreferences
              ?.map((sp: any) => `${sp.subject.name} - ${sp.subjectType.name}`)
              .join("; ") || "";
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
        "Content-Disposition": `attachment; filename="teachers_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }
);
