// src/app/api/students/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentFilterSchema } from "@/schemas/student.schema";
import { STUDENT_CSV_HEADERS } from "@/schemas/import/student-import.schema";
import { getOrderedCsvHeaders, getExportColumns, STUDENT_COLUMN_RULES } from "@/schemas/import/student-column-rules";
import { format } from "date-fns";

// Helper function to format date for CSV
function formatDateForCSV(date: Date | null): string {
  if (!date) return "";
  return format(new Date(date), "yyyy-MM-dd");
}

// Helper function to format enum values back to their readable form
function formatEnumForCSV(value: string | null, type: "schoolType" | "examCategory" | "examCategoryType"): string {
  if (!value) return "";

  switch (type) {
    case "schoolType":
    case "examCategoryType":
      return value === "PUBLIC" ? "公立" : value === "PRIVATE" ? "私立" : value;
    case "examCategory":
      const examCategoryMap: Record<string, string> = {
        "BEGINNER": "小学校",
        "ELEMENTARY": "中学校",
        "HIGH_SCHOOL": "高校",
        "UNIVERSITY": "大学"
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
    const lineConnectionList = searchParams.get("lineConnection")?.split(",") || [];
    const schoolTypeList = searchParams.get("schoolType")?.split(",") || [];
    const examCategoryList = searchParams.get("examCategory")?.split(",") || [];
    const examCategoryTypeList = searchParams.get("examCategoryType")?.split(",") || [];
    const birthDateFrom = searchParams.get("birthDateFrom") ? new Date(searchParams.get("birthDateFrom")!) : undefined;
    const birthDateTo = searchParams.get("birthDateTo") ? new Date(searchParams.get("birthDateTo")!) : undefined;
    const examDateFrom = searchParams.get("examDateFrom") ? new Date(searchParams.get("examDateFrom")!) : undefined;
    const examDateTo = searchParams.get("examDateTo") ? new Date(searchParams.get("examDateTo")!) : undefined;

    // Get visible columns from query params
    const visibleColumns = searchParams.get("columns")?.split(",") || [];

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

    // Apply client-side filters
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

    // Filter by LINE connection status
    if (lineConnectionList.length > 0) {
      const lineConnectionSet = new Set(lineConnectionList);
      filteredStudents = filteredStudents.filter(student => {
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
      filteredStudents = filteredStudents.filter(student =>
        student.schoolType && schoolTypeSet.has(student.schoolType)
      );
    }

    // Filter by exam category
    if (examCategoryList.length > 0) {
      const examCategorySet = new Set(examCategoryList);
      filteredStudents = filteredStudents.filter(student =>
        student.examCategory && examCategorySet.has(student.examCategory)
      );
    }

    // Filter by exam category type
    if (examCategoryTypeList.length > 0) {
      const examCategoryTypeSet = new Set(examCategoryTypeList);
      filteredStudents = filteredStudents.filter(student =>
        student.examCategoryType && examCategoryTypeSet.has(student.examCategoryType)
      );
    }

    // Filter by birth date range
    if (birthDateFrom || birthDateTo) {
      filteredStudents = filteredStudents.filter(student => {
        if (!student.birthDate) return false;
        const birthDate = new Date(student.birthDate);
        if (birthDateFrom && birthDate < birthDateFrom) return false;
        if (birthDateTo && birthDate > birthDateTo) return false;
        return true;
      });
    }

    // Filter by exam date range
    if (examDateFrom || examDateTo) {
      filteredStudents = filteredStudents.filter(student => {
        if (!student.examDate) return false;
        const examDate = new Date(student.examDate);
        if (examDateFrom && examDate < examDateFrom) return false;
        if (examDateTo && examDate > examDateTo) return false;
        return true;
      });
    }

    // Get ordered CSV headers based on column rules
    const headers = getOrderedCsvHeaders().join(",");

    // Build CSV rows to match import schema exactly
    const rows = filteredStudents.map((student) => {
      // Get unique subject names (for subjects column)
      const subjectNames = student.user?.subjectPreferences
        ?.reduce((acc: string[], pref: any) => {
          if (!acc.includes(pref.subject.name)) {
            acc.push(pref.subject.name);
          }
          return acc;
        }, []) || [];

      // Get branch names (for branches column)
      const branchNames = student.user?.branches
        ?.map((b: any) => b.branch.name) || [];

      // Create row data based on column rules
      const rowData: Record<string, string> = {};

      // Process each column according to rules
      for (const [key, rule] of Object.entries(STUDENT_COLUMN_RULES)) {
        // Skip ignored columns
        if (rule.createRule === 'ignore' && rule.updateRule === 'ignore') {
          rowData[rule.csvHeader] = "";
          continue;
        }

        switch (rule.dbField) {
          case 'name':
            rowData[rule.csvHeader] = student.name || "";
            break;
          case 'kanaName':
            rowData[rule.csvHeader] = student.kanaName || "";
            break;
          case 'studentTypeName':
            rowData[rule.csvHeader] = student.studentType?.name || "";
            break;
          case 'gradeYear':
            rowData[rule.csvHeader] = student.gradeYear?.toString() || "";
            break;
          case 'birthDate':
            rowData[rule.csvHeader] = formatDateForCSV(student.birthDate);
            break;
          case 'schoolName':
            rowData[rule.csvHeader] = student.schoolName || "";
            break;
          case 'schoolType':
            rowData[rule.csvHeader] = formatEnumForCSV(student.schoolType, "schoolType");
            break;
          case 'examCategory':
            rowData[rule.csvHeader] = formatEnumForCSV(student.examCategory, "examCategory");
            break;
          case 'examCategoryType':
            rowData[rule.csvHeader] = formatEnumForCSV(student.examCategoryType, "examCategoryType");
            break;
          case 'firstChoice':
            rowData[rule.csvHeader] = student.firstChoice || "";
            break;
          case 'secondChoice':
            rowData[rule.csvHeader] = student.secondChoice || "";
            break;
          case 'examDate':
            rowData[rule.csvHeader] = formatDateForCSV(student.examDate);
            break;
          case 'username':
            rowData[rule.csvHeader] = student.user?.username || "";
            break;
          case 'email':
            rowData[rule.csvHeader] = student.user?.email || "";
            break;
          case 'parentEmail':
            rowData[rule.csvHeader] = student.parentEmail || "";
            break;
          case 'password':
            rowData[rule.csvHeader] = ""; // Never export passwords
            break;
          case 'homePhone':
            rowData[rule.csvHeader] = student.homePhone || "";
            break;
          case 'parentPhone':
            rowData[rule.csvHeader] = student.parentPhone || "";
            break;
          case 'studentPhone':
            rowData[rule.csvHeader] = student.studentPhone || "";
            break;
          case 'branches':
            rowData[rule.csvHeader] = branchNames.join(";");
            break;
          case 'notes':
            rowData[rule.csvHeader] = student.notes || "";
            break;
          default:
            rowData[rule.csvHeader] = "";
        }
      }

      // Build row in correct order
      const row = getOrderedCsvHeaders().map(header => {
        const value = rowData[header] || "";

        // Escape CSV values
        if (value.includes(",") || value.includes("\n") || value.includes('"')) {
          // Escape quotes by doubling them
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });

      return row.join(",");
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
