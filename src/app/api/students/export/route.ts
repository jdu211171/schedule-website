// src/app/api/students/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentFilterSchema } from "@/schemas/student.schema";

// CSV export handler for students
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, selectedBranchId) => {
    const searchParams = request.nextUrl.searchParams;
    const filters = studentFilterSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10000, // Large limit for export
      name: searchParams.get("name") || undefined,
      status: searchParams.get("status")?.split(",")[0] || undefined, // Take first status for API
      studentTypeIds: searchParams.get("studentType")?.split(",") || undefined,
    });

    const { name, status, studentTypeIds } = filters;
    
    // Get additional filters from query params
    const statusList = searchParams.get("status")?.split(",") || [];
    const studentTypeList = searchParams.get("studentType")?.split(",") || [];
    const gradeYearList = searchParams.get("gradeYear")?.split(",") || [];
    const branchList = searchParams.get("branch")?.split(",") || [];
    const subjectList = searchParams.get("subject")?.split(",") || [];

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
      },
      orderBy: { name: "asc" },
    });

    // Apply client-side filters (same logic as in the table component)
    let filteredStudents = students;

    // Filter by multiple statuses if needed
    if (statusList.length > 1) {
      const statusSet = new Set(statusList);
      filteredStudents = filteredStudents.filter(student => 
        statusSet.has(student.status || "ACTIVE")
      );
    }

    // Filter by student types (by name, not ID)
    if (studentTypeList.length > 0) {
      const studentTypeSet = new Set(studentTypeList);
      filteredStudents = filteredStudents.filter(student => 
        student.studentType && studentTypeSet.has(student.studentType.name)
      );
    }

    // Filter by grade years
    if (gradeYearList.length > 0) {
      const gradeYearSet = new Set(gradeYearList);
      filteredStudents = filteredStudents.filter(student => 
        student.gradeYear !== null && gradeYearSet.has(student.gradeYear.toString())
      );
    }

    // Filter by branches
    if (branchList.length > 0) {
      const branchSet = new Set(branchList);
      filteredStudents = filteredStudents.filter(student => 
        student.user?.branches?.some((b: any) => branchSet.has(b.branch.name))
      );
    }

    // Filter by subjects
    if (subjectList.length > 0) {
      const subjectSet = new Set(subjectList);
      filteredStudents = filteredStudents.filter(student => {
        if (!student.user?.subjectPreferences) return false;
        
        return student.user.subjectPreferences.some((pref: any) => 
          subjectSet.has(pref.subject.name)
        );
      });
    }

    // Get visible columns from query params
    const visibleColumns = searchParams.get("columns")?.split(",") || [
      "name",
      "kanaName",
      "status",
      "studentTypeName",
      "gradeYear",
      "username",
      "email",
      "lineId",
      "branches",
      "subjectPreferences",
    ];

    // Column headers mapping
    const columnHeaders: Record<string, string> = {
      name: "名前",
      kanaName: "カナ",
      status: "ステータス",
      studentTypeName: "生徒タイプ",
      gradeYear: "学年",
      username: "ユーザー名",
      email: "メールアドレス",
      password: "パスワード",
      lineId: "LINE ID",
      branches: "校舎",
      subjectPreferences: "選択科目",
    };

    // Status labels
    const statusLabels: Record<string, string> = {
      ACTIVE: "在籍",
      SICK: "休会",
      PERMANENTLY_LEFT: "退会",
    };

    // Build CSV header
    const headers = visibleColumns
      .map((col) => columnHeaders[col] || col)
      .join(",");

    // Build CSV rows - use filtered students
    const rows = filteredStudents.map((student) => {
      const row = visibleColumns.map((col) => {
        switch (col) {
          case "name":
            return student.name || "";
          case "kanaName":
            return student.kanaName || "";
          case "status":
            return statusLabels[student.status || "ACTIVE"] || student.status || "";
          case "studentTypeName":
            return student.studentType?.name || "";
          case "gradeYear":
            return student.gradeYear !== null ? `${student.gradeYear}年生` : "";
          case "username":
            return student.user?.username || "";
          case "email":
            return student.user?.email || "";
          case "password":
            // Don't export passwords for security
            return "";
          case "lineId":
            return student.lineId || "";
          case "branches":
            return student.user?.branches
              ?.map((b: any) => b.branch.name)
              .join("; ") || "";
          case "subjectPreferences":
            return student.user?.subjectPreferences
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
        "Content-Disposition": `attachment; filename="students_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }
);