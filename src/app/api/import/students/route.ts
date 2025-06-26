import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { CSVParser } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import {
  studentImportSchema,
  STUDENT_CSV_HEADERS,
  REQUIRED_STUDENT_CSV_HEADERS,
  type StudentImportData,
  type ImportResult,
  formatValidationErrors
} from "@/schemas/import";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { handleImportError } from "@/lib/import-error-handler";

async function handleImport(req: NextRequest, session: any, branchId: string) {
  try {
    // Get the form data
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "ファイルが選択されていません" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await (file as Blob).arrayBuffer());

    // Parse CSV file
    const parseResult = await CSVParser.parseBuffer<Record<string, string>>(buffer);

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: "CSVファイルの解析に失敗しました",
          details: parseResult.errors
        },
        { status: 400 }
      );
    }

    // Validate CSV headers
    if (parseResult.data.length === 0) {
      return NextResponse.json(
        { error: "CSVファイルが空です" },
        { status: 400 }
      );
    }

    const actualHeaders = Object.keys(parseResult.data[0]);
    const requiredHeaders = [...REQUIRED_STUDENT_CSV_HEADERS];
    const missingHeaders = requiredHeaders.filter(h => !actualHeaders.includes(h));

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: `必須列が不足しています: ${missingHeaders.join(", ")}`
        },
        { status: 400 }
      );
    }

    // Process and validate each row
    const validatedData: (StudentImportData & { studentTypeId: string, subjectIds?: string[] })[] = [];
    const result: ImportResult = {
      success: 0,
      errors: [],
      warnings: []
    };

    // Pre-fetch all student types and subjects for validation
    const allStudentTypes = await prisma.studentType.findMany({
      select: { studentTypeId: true, name: true, maxYears: true }
    });
    const studentTypeMap = new Map(allStudentTypes.map(st => [st.name, st]));

    const allSubjects = await prisma.subject.findMany({
      select: { subjectId: true, name: true }
    });
    const subjectMap = new Map(allSubjects.map(s => [s.name, s.subjectId]));

    // Detect extra columns and add warning if found
    const knownHeaders = new Set(STUDENT_CSV_HEADERS);
    const extraHeaders = actualHeaders.filter(h => !knownHeaders.has(h as any));
    if (extraHeaders.length > 0) {
      result.warnings.push({
        message: `次の列は無視されます: ${extraHeaders.join(", ")}`,
        type: "extra_columns"
      });
    }

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // +1 for header, +1 for 1-based indexing

      try {
        // Filter out unknown columns before validation
        const filteredRow: Record<string, string> = {};
        for (const header of STUDENT_CSV_HEADERS) {
          if (header in row) {
            filteredRow[header] = row[header];
          }
        }

        // Validate row data with filtered columns
        const validated = studentImportSchema.parse(filteredRow);

        // Check if user with same username or email already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { username: validated.username },
              { email: validated.email }
            ]
          }
        });

        if (existingUser) {
          if (existingUser.username === validated.username) {
            result.errors.push({
              row: rowNumber,
              errors: [`ユーザー名「${validated.username}」は既に使用されています`]
            });
          } else {
            result.errors.push({
              row: rowNumber,
              errors: [`メールアドレス「${validated.email}」は既に使用されています`]
            });
          }
          continue;
        }


        // Validate student type
        const studentType = studentTypeMap.get(validated.studentTypeName);
        if (!studentType) {
          result.errors.push({
            row: rowNumber,
            errors: [`学生タイプ「${validated.studentTypeName}」が見つかりません`]
          });
          continue;
        }

        // Validate grade year against student type max years
        if (studentType.maxYears !== null && validated.gradeYear > studentType.maxYears) {
          result.errors.push({
            row: rowNumber,
            errors: [`学年${validated.gradeYear}は学生タイプ「${validated.studentTypeName}」の最大学年${studentType.maxYears}を超えています`]
          });
          continue;
        }

        // Validate subjects if provided
        let subjectIds: string[] = [];
        if (validated.subjects && validated.subjects.length > 0) {
          const invalidSubjects = validated.subjects.filter(name => !subjectMap.has(name));
          if (invalidSubjects.length > 0) {
            result.errors.push({
              row: rowNumber,
              errors: [`科目が見つかりません: ${invalidSubjects.join(", ")}`]
            });
            continue;
          }
          subjectIds = validated.subjects.map(name => subjectMap.get(name)!);
        }

        validatedData.push({
          ...validated,
          studentTypeId: studentType.studentTypeId,
          subjectIds
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          result.errors.push(formatValidationErrors(error.errors, rowNumber));
        } else {
          result.errors.push({
            row: rowNumber,
            errors: [error instanceof Error ? error.message : "データ検証中にエラーが発生しました"]
          });
        }
      }
    }

    // If there are critical errors, don't proceed with import
    if (result.errors.length > 0 && validatedData.length === 0) {
      return NextResponse.json(result, { status: 400 });
    }

    // Import valid data in a transaction
    if (validatedData.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const data of validatedData) {
          // Handle password - use provided password or generate a default one
          let passwordToHash: string;
          if (data.password) {
            passwordToHash = data.password;
          } else {
            // Generate a default password: username + "123"
            passwordToHash = `${data.username}123`;
          }
          
          // Hash password
          const hashedPassword = await bcrypt.hash(passwordToHash, 10);

          // Create user
          const user = await tx.user.create({
            data: {
              username: data.username,
              email: data.email,
              passwordHash: hashedPassword,
              name: data.name,
              role: "STUDENT",
              isRestrictedAdmin: false
            }
          });

          // Create student with all fields
          await tx.student.create({
            data: {
              userId: user.id,
              name: data.name,
              kanaName: data.kanaName || null,
              studentTypeId: data.studentTypeId,
              gradeYear: data.gradeYear,
              lineId: data.lineId || null,
              notes: data.notes || null,
              status: "ACTIVE",
              // School information
              schoolName: data.schoolName || null,
              schoolType: data.schoolType || null,
              // Exam information
              examCategory: data.examCategory || null,
              examCategoryType: data.examCategoryType || null,
              firstChoice: data.firstChoice || null,
              secondChoice: data.secondChoice || null,
              examDate: data.examDate || null,
              // Contact information
              homePhone: data.homePhone || null,
              parentPhone: data.parentPhone || null,
              studentPhone: data.studentPhone || null,
              parentEmail: data.parentEmail || null,
              // Personal information
              birthDate: data.birthDate || null
            }
          });

          // Assign student to branch
          await tx.userBranch.create({
            data: {
              userId: user.id,
              branchId: branchId
            }
          });

          result.success++;
        }
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleImportError(error);
  }
}

export const POST = withBranchAccess(["ADMIN", "STAFF"], handleImport);
