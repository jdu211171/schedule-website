// src/app/api/teachers/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teacherFilterSchema } from "@/schemas/teacher.schema";
import { getTeacherExportColumns, TEACHER_COLUMN_RULES } from "@/schemas/import/teacher-column-rules";
import { formatLocalYMD } from "@/lib/date";

// Helper: format date as YYYY-MM-DD
function formatDateForCSV(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// CSV export handler for teachers (mirrors student export style)
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, selectedBranchId) => {
    const searchParams = request.nextUrl.searchParams;
    const streamMode = searchParams.get("stream") === "1";
    const filters = teacherFilterSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10000,
      name: searchParams.get("name") || undefined,
      status: searchParams.get("status")?.split(",")[0] || undefined,
    });

    const { name, status } = filters;

    // Additional filters from query
    const statusList = searchParams.get("status")?.split(",") || [];
    const branchList = searchParams.get("branch")?.split(",") || [];
    const subjectList = searchParams.get("subject")?.split(",") || [];
    const lineConnectionList = searchParams.get("lineConnection")?.split(",") || [];

    // Build where clause (branch scoped)
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

    if (status && statusList.length === 1) {
      where.status = status;
    }

    // Pre-fetch teachers with necessary relations
    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        user: {
          include: {
            branches: { include: { branch: true } },
            subjectPreferences: { include: { subject: true, subjectType: true } },
          },
        },
        contactEmails: true,
        contactPhones: true,
      },
      orderBy: { name: "asc" },
    });

    // Client-side filters (same as table)
    let filteredTeachers = teachers;

    if (statusList.length > 1) {
      const statusSet = new Set(statusList);
      filteredTeachers = filteredTeachers.filter(t => statusSet.has(t.status || "ACTIVE"));
    }

    if (branchList.length > 0) {
      const branchSet = new Set(branchList);
      filteredTeachers = filteredTeachers.filter(t => t.user?.branches?.some((b: any) => branchSet.has(b.branch.name)));
    }

    if (subjectList.length > 0) {
      const subjectSet = new Set(subjectList);
      filteredTeachers = filteredTeachers.filter(t => t.user?.subjectPreferences?.some((sp: any) => subjectSet.has(sp.subject.name)));
    }

    if (lineConnectionList.length > 0) {
      const set = new Set(lineConnectionList);
      filteredTeachers = filteredTeachers.filter(t => {
        const hasLine = !!t.lineId;
        const notificationsEnabled = t.lineNotificationsEnabled ?? true;
        const s = !hasLine ? "not_connected" : notificationsEnabled ? "connected_enabled" : "connected_disabled";
        return set.has(s);
      });
    }

    // Determine visible columns (from query) and ensure ID first
    const rawColumns = searchParams.get("columns")?.split(",") || [
      "id",
      "name",
      "kanaName",
      "status",
      "birthDate",
      "username",
      "email",
      "contactPhones",
      "contactEmails",
      "phoneNumber",
      "password",
      "branches",
      "subjects",
      "notes",
    ];
    const visibleColumns = rawColumns.includes("id") ? rawColumns : ["id", ...rawColumns];

    // Filter out privacy/ignored columns same as student export style
    const allowedColumns = visibleColumns.filter(col =>
      !["lineId", "lineConnection", "lineNotificationsEnabled", "phoneNotes"].includes(col)
    );

    // Build column -> header mapping from rules
    const columnIdToHeader: Record<string, string> = { id: 'ID' };
    for (const [key, rule] of Object.entries(TEACHER_COLUMN_RULES)) {
      columnIdToHeader[key] = rule.csvHeader;
    }
    // Accept UI alias for subjects column
    columnIdToHeader['subjectPreferences'] = '選択科目';

    // Build header line
    const headers = allowedColumns.map(col => columnIdToHeader[col] || col).join(",");

    const statusLabels: Record<string, string> = { ACTIVE: '在籍', SICK: '休会', PERMANENTLY_LEFT: '退会' };

    // Row formatter
    const formatValue = (t: any, col: string): string => {
      switch (col) {
        case 'id':
          return t.teacherId || '';
        case 'name':
          return t.name || '';
        case 'kanaName':
          return t.kanaName || '';
        case 'status':
          return statusLabels[t.status || 'ACTIVE'] || t.status || '';
        case 'birthDate':
          return formatDateForCSV(t.birthDate || null);
        case 'username':
          return t.user?.username || '';
        case 'email':
          return t.user?.email || '';
        case 'password':
          return '';
        case 'phoneNumber':
          return t.phoneNumber || '';
        case 'branches':
          return t.user?.branches?.map((b: any) => b.branch.name).join('; ') || '';
        case 'subjects':
        case 'subjectPreferences':
          return t.user?.subjectPreferences?.map((sp: any) => `${sp.subject.name} - ${sp.subjectType.name}`).join('; ') || '';
        case 'contactEmails':
          return (
            t.contactEmails
              ?.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
              .map((e: any) => (e.notes ? `${e.email}:${e.notes}` : e.email))
              .join('; ') || ''
          );
        case 'contactPhones': {
          return (
            t.contactPhones
              ?.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
              .map((p: any) => (p.notes ? `${p.phoneNumber}:${p.notes}` : `${p.phoneNumber}`))
              .join('; ') || ''
          );
        }
        case 'notes':
          return t.notes || '';
        default:
          return '';
      }
    };

    // Streaming export for large datasets (mirrors student style)
    if (streamMode) {
      const pageSize = Number.parseInt(process.env.EXPORT_PAGE_SIZE || "1000", 10);
      const filename = `teachers_${formatLocalYMD(new Date())}.csv`;
      const encoder = new TextEncoder();

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          controller.enqueue(encoder.encode("\uFEFF" + headers + "\n"));

          let cursor: string | undefined = undefined;
          while (true) {
            const chunk: any[] = await prisma.teacher.findMany({
              where,
              include: {
                user: {
                  include: {
                    branches: { include: { branch: true } },
                    subjectPreferences: { include: { subject: true, subjectType: true } },
                  },
                },
                contactEmails: true,
                contactPhones: true,
              },
              orderBy: { teacherId: 'asc' },
              ...(cursor ? { cursor: { teacherId: cursor }, skip: 1, take: pageSize } : { take: pageSize }),
            });

            if (!chunk.length) break;

            for (const t of chunk) {
              const cols = allowedColumns.map((col) => {
                const v = formatValue(t as any, col);
                return v.includes(",") || v.includes("\n") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
              });
              controller.enqueue(encoder.encode(cols.join(",") + "\n"));
            }

            cursor = chunk[chunk.length - 1]?.teacherId;
          }

          controller.close();
        },
      });

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Non-streaming: build rows eagerly
    const rows = filteredTeachers.map((t) => {
      const row = allowedColumns.map((col) => {
        const value = formatValue(t as any, col);
        if (value.includes(",") || value.includes("\n") || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      return row.join(",");
    });

    const csv = [headers, ...rows].join("\n");
    const csvContent = "\uFEFF" + csv;
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="teachers_${formatLocalYMD(new Date())}.csv"`,
      },
    });
  }
);
