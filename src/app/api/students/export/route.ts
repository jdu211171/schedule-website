// src/app/api/students/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentFilterSchema } from "@/schemas/student.schema";
import { STUDENT_CSV_HEADERS } from "@/schemas/import/student-import.schema";
import {
  getOrderedCsvHeaders,
  getExportColumns,
  STUDENT_COLUMN_RULES,
} from "@/schemas/import/student-column-rules";
import { format } from "date-fns";
import { formatLocalYMD } from "@/lib/date";

// Helper function to format date for CSV
function formatDateForCSV(date: Date | null): string {
  if (!date) return "";
  return format(new Date(date), "yyyy-MM-dd");
}

// Helper function to format enum values back to their readable form
function formatEnumForCSV(
  value: string | null,
  type: "schoolType" | "examCategory" | "examCategoryType"
): string {
  if (!value) return "";

  switch (type) {
    case "schoolType":
    case "examCategoryType":
      return value === "PUBLIC" ? "公立" : value === "PRIVATE" ? "私立" : value;
    case "examCategory":
      const examCategoryMap: Record<string, string> = {
        BEGINNER: "小学校",
        ELEMENTARY: "中学校",
        HIGH_SCHOOL: "高校",
        UNIVERSITY: "大学",
      };
      return examCategoryMap[value] || value;
    default:
      return value;
  }
}

// CSV export handler for students

export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, selectedBranchId) => {
    const searchParams = request.nextUrl.searchParams;
    const streamMode = searchParams.get("stream") === "1";
    const filters = studentFilterSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10000, // Large limit for export
      name: searchParams.get("name") || undefined,
      status: searchParams.get("status")?.split(",")[0] || undefined,
      studentTypeIds: searchParams.get("studentType")?.split(",") || undefined,
    });

    const { name, status } = filters;

    // Get additional filters from query params
    const statusList = searchParams.get("status")?.split(",") || [];
    const studentTypeList = searchParams.get("studentType")?.split(",") || [];
    const gradeYearList = searchParams.get("gradeYear")?.split(",") || [];
    const branchList = searchParams.get("branch")?.split(",") || [];
    const subjectList = searchParams.get("subject")?.split(",") || [];
    const lineConnectionList =
      searchParams.get("lineConnection")?.split(",") || [];
    const schoolTypeList = searchParams.get("schoolType")?.split(",") || [];
    const examCategoryList = searchParams.get("examCategory")?.split(",") || [];
    const examCategoryTypeList =
      searchParams.get("examCategoryType")?.split(",") || [];
    const birthDateFrom = searchParams.get("birthDateFrom")
      ? new Date(searchParams.get("birthDateFrom")!)
      : undefined;
    const birthDateTo = searchParams.get("birthDateTo")
      ? new Date(searchParams.get("birthDateTo")!)
      : undefined;
    const admissionDateFrom = searchParams.get("admissionDateFrom")
      ? new Date(searchParams.get("admissionDateFrom")!)
      : undefined;
    const admissionDateTo = searchParams.get("admissionDateTo")
      ? new Date(searchParams.get("admissionDateTo")!)
      : undefined;
    const examDateFrom = searchParams.get("examDateFrom")
      ? new Date(searchParams.get("examDateFrom")!)
      : undefined;
    const examDateTo = searchParams.get("examDateTo")
      ? new Date(searchParams.get("examDateTo")!)
      : undefined;

    // Get visible columns from query params
    const rawColumns = searchParams.get("columns")?.split(",") || [
      "id",
      "name",
      "kanaName",
      "status",
      "studentTypeName",
      "gradeYear",
      "birthDate",
      "admissionDate",
      "schoolName",
      "schoolType",
      "examCategory",
      "examCategoryType",
      "firstChoice",
      "secondChoice",
      "examDate",
      "username",
      "email",
      "parentEmail",
      "contactPhones",
      "branches",
      "notes",
    ];

    // Ensure ID is included and then filter out disallowed columns
    const visibleColumns = rawColumns.includes("id")
      ? rawColumns
      : ["id", ...rawColumns];

    // Filter out LINE-related fields, phone fields, and contactPhones for security/privacy
    const allowedColumns = visibleColumns.filter(
      (col) =>
        ![
          "lineId",
          "lineConnection",
          "lineNotificationsEnabled",
          "homePhone",
          "parentPhone",
          "studentPhone",
        ].includes(col)
    );

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

    // Fetch students with all related data
    const students = await prisma.student.findMany({
      where,
      include: {
        studentType: true,
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
        contactPhones: true,
        contactEmails: true,
      },
      orderBy: [
        {
          studentType: {
            order: { sort: "asc", nulls: "last" },
          },
        },
        { name: "asc" },
      ],
    });

    // Apply client-side filters
    let filteredStudents = students;

    // Filter by multiple statuses if needed
    if (statusList.length > 1) {
      const statusSet = new Set(statusList);
      filteredStudents = filteredStudents.filter((student) =>
        statusSet.has(student.status || "ACTIVE")
      );
    }

    // Filter by student types (by name, not ID)
    if (studentTypeList.length > 0) {
      const studentTypeSet = new Set(studentTypeList);
      filteredStudents = filteredStudents.filter(
        (student) =>
          student.studentType && studentTypeSet.has(student.studentType.name)
      );
    }

    // Filter by grade years
    if (gradeYearList.length > 0) {
      const gradeYearSet = new Set(gradeYearList);
      filteredStudents = filteredStudents.filter(
        (student) =>
          student.gradeYear !== null &&
          gradeYearSet.has(student.gradeYear.toString())
      );
    }

    // Filter by branches
    if (branchList.length > 0) {
      const branchSet = new Set(branchList);
      filteredStudents = filteredStudents.filter((student) =>
        student.user?.branches?.some((b: any) => branchSet.has(b.branch.name))
      );
    }

    // Filter by subjects
    if (subjectList.length > 0) {
      const subjectSet = new Set(subjectList);
      filteredStudents = filteredStudents.filter((student) => {
        if (!student.user?.subjectPreferences) return false;
        return student.user.subjectPreferences.some((pref: any) =>
          subjectSet.has(pref.subject.name)
        );
      });
    }

    // Filter by LINE connection status
    if (lineConnectionList.length > 0) {
      const lineConnectionSet = new Set(lineConnectionList);
      filteredStudents = filteredStudents.filter((student) => {
        const hasLine = !!student.lineId;
        const notificationsEnabled = student.lineNotificationsEnabled ?? true;

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

    // Filter by school type
    if (schoolTypeList.length > 0) {
      const schoolTypeSet = new Set(schoolTypeList);
      filteredStudents = filteredStudents.filter(
        (student) => student.schoolType && schoolTypeSet.has(student.schoolType)
      );
    }

    // Filter by exam category
    if (examCategoryList.length > 0) {
      const examCategorySet = new Set(examCategoryList);
      filteredStudents = filteredStudents.filter(
        (student) =>
          student.examCategory && examCategorySet.has(student.examCategory)
      );
    }

    // Filter by exam category type
    if (examCategoryTypeList.length > 0) {
      const examCategoryTypeSet = new Set(examCategoryTypeList);
      filteredStudents = filteredStudents.filter(
        (student) =>
          student.examCategoryType &&
          examCategoryTypeSet.has(student.examCategoryType)
      );
    }

    // Filter by birth date range
    if (birthDateFrom || birthDateTo) {
      filteredStudents = filteredStudents.filter((student) => {
        if (!student.birthDate) return false;
        const birthDate = new Date(student.birthDate);
        if (birthDateFrom && birthDate < birthDateFrom) return false;
        if (birthDateTo && birthDate > birthDateTo) return false;
        return true;
      });
    }

    // Filter by admission date range
    if (admissionDateFrom || admissionDateTo) {
      filteredStudents = filteredStudents.filter((student) => {
        const adm = (student as any).admissionDate as
          | Date
          | string
          | null
          | undefined;
        if (!adm) return false;
        const d = new Date(adm);
        if (admissionDateFrom && d < admissionDateFrom) return false;
        if (admissionDateTo && d > admissionDateTo) return false;
        return true;
      });
    }

    // Filter by exam date range
    if (examDateFrom || examDateTo) {
      filteredStudents = filteredStudents.filter((student) => {
        if (!student.examDate) return false;
        const examDate = new Date(student.examDate);
        if (examDateFrom && examDate < examDateFrom) return false;
        if (examDateTo && examDate > examDateTo) return false;
        return true;
      });
    }

    // Column ID to CSV header mapping based on column rules
    const columnIdToHeader: Record<string, string> = {};
    const headerToColumnId: Record<string, string> = {};

    // Build mappings from column rules
    for (const [key, rule] of Object.entries(STUDENT_COLUMN_RULES)) {
      // Map common column IDs to CSV headers
      switch (key) {
        case "studentTypeName":
          columnIdToHeader["studentTypeName"] = rule.csvHeader;
          headerToColumnId[rule.csvHeader] = "studentTypeName";
          break;
        case "name":
        case "kanaName":
        case "status":
        case "gradeYear":
        case "birthDate":
        case "admissionDate":
        case "schoolName":
        case "schoolType":
        case "examCategory":
        case "examCategoryType":
        case "firstChoice":
        case "secondChoice":
        case "examDate":
        case "username":
        case "email":
        case "parentEmail":
        case "password":
        case "branches":
        case "notes":
          columnIdToHeader[key] = rule.csvHeader;
          headerToColumnId[rule.csvHeader] = key;
          break;
      }
    }

    // Map subject preferences column to Japanese header
    columnIdToHeader["subjectPreferences"] = "選択科目";
    headerToColumnId["選択科目"] = "subjectPreferences";
    // Map contact emails aggregated column
    columnIdToHeader["contactEmails"] = "連絡先メール";
    headerToColumnId["連絡先メール"] = "contactEmails";

    // Map contact phones aggregated column
    columnIdToHeader["contactPhones"] = "連絡先電話";
    headerToColumnId["連絡先電話"] = "contactPhones";

    // Add ID header mapping
    columnIdToHeader["id"] = "ID";
    headerToColumnId["ID"] = "id";

    // Build CSV header from allowed columns
    const headers = allowedColumns
      .map((col) => columnIdToHeader[col] || col)
      .join(",");

    // Helper to format one row value by column id
    const formatValue = (student: any, col: string): string => {
      switch (col) {
        case "id":
          return student.studentId || "";
        case "name":
          return student.name || "";
        case "kanaName":
          return student.kanaName || "";
        case "status": {
          const statusLabels: Record<string, string> = {
            ACTIVE: "在籍",
            SICK: "休会",
            PERMANENTLY_LEFT: "退会",
          };
          return (
            statusLabels[student.status || "ACTIVE"] || student.status || ""
          );
        }
        case "studentTypeName":
          return student.studentType?.name || "";
        case "gradeYear":
          return student.gradeYear?.toString() || "";
        case "birthDate":
          return formatDateForCSV(student.birthDate);
        case "admissionDate":
          return formatDateForCSV((student as any).admissionDate ?? null);
        case "schoolName":
          return student.schoolName || "";
        case "schoolType":
          return formatEnumForCSV(student.schoolType, "schoolType");
        case "examCategory":
          return formatEnumForCSV(student.examCategory, "examCategory");
        case "examCategoryType":
          return formatEnumForCSV(student.examCategoryType, "examCategoryType");
        case "firstChoice":
          return student.firstChoice || "";
        case "secondChoice":
          return student.secondChoice || "";
        case "examDate":
          return formatDateForCSV(student.examDate);
        case "username":
          return student.user?.username || "";
        case "email":
          return student.user?.email || "";
        case "parentEmail":
          return student.parentEmail || "";
        case "password":
          // Never export passwords
          return "";
        case "branches":
          return (
            student.user?.branches?.map((b: any) => b.branch.name).join("; ") ||
            ""
          );
        case "subjectPreferences":
          return (
            student.user?.subjectPreferences
              ?.map((sp: any) => `${sp.subject.name} - ${sp.subjectType.name}`)
              .join("; ") || ""
          );
        case "contactEmails":
          return (
            student.contactEmails
              ?.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
              .map((e: any) => (e.notes ? `${e.email}:${e.notes}` : e.email))
              .join("; ") || ""
          );
        case "contactPhones": {
          const label = (t: string) =>
            t === "HOME"
              ? "自宅"
              : t === "DAD"
                ? "父"
                : t === "MOM"
                  ? "母"
                  : "その他";
          return (
            student.contactPhones
              ?.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
              .map((p: any) => `${label(p.phoneType)}:${p.phoneNumber}`)
              .join("; ") || ""
          );
        }
        case "notes":
          return student.notes || "";
        default:
          return "";
      }
    };

    // Streaming mode for large exports
    if (streamMode) {
      const pageSize = Number.parseInt(
        process.env.EXPORT_PAGE_SIZE || "1000",
        10
      );
      const filename = `students_${formatLocalYMD(new Date())}.csv`;
      const encoder = new TextEncoder();

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          // Write BOM + header
          controller.enqueue(encoder.encode("\uFEFF" + headers + "\n"));

          let cursor: string | undefined = undefined;
          while (true) {
            const page: any[] = await prisma.student.findMany({
              where,
              include: {
                studentType: true,
                user: {
                  include: {
                    branches: { include: { branch: true } },
                    subjectPreferences: {
                      include: { subject: true, subjectType: true },
                    },
                  },
                },
                contactPhones: true,
                contactEmails: true,
              },
              orderBy: { studentId: "asc" },
              ...(cursor
                ? { cursor: { studentId: cursor }, skip: 1, take: pageSize }
                : { take: pageSize }),
            });

            if (!page.length) break;

            for (const student of page) {
              const cols = allowedColumns.map((col) => {
                const v = formatValue(student as any, col);
                return v.includes(",") || v.includes("\n") || v.includes('"')
                  ? `"${v.replace(/"/g, '""')}"`
                  : v;
              });
              controller.enqueue(encoder.encode(cols.join(",") + "\n"));
            }

            cursor = page[page.length - 1]?.studentId;
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

    // Non-streaming: build rows in memory (backward compatible)
    const rows = filteredStudents.map((student) => {
      const row = allowedColumns.map((col) => {
        const value = formatValue(student as any, col);
        if (
          value.includes(",") ||
          value.includes("\n") ||
          value.includes('"')
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      return row.join(",");
    });

    const csv = [headers, ...rows].join("\n");
    const bom = "\uFEFF";
    const csvContent = bom + csv;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="students_${formatLocalYMD(new Date())}.csv"`,
      },
    });
  }
);
