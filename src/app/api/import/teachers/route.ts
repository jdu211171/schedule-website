import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { CSVParser } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import {
  teacherImportSchema,
  TEACHER_CSV_HEADERS,
  REQUIRED_TEACHER_CSV_HEADERS,
  type TeacherImportData,
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
    const requiredHeaders = [...REQUIRED_TEACHER_CSV_HEADERS];
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
    const validatedData: (TeacherImportData & { subjectIds?: string[], subjectTypeIds?: string[] })[] = [];
    const result: ImportResult = {
      success: 0,
      errors: [],
      warnings: []
    };

    // Pre-fetch all subjects and subject types for validation
    const allSubjects = await prisma.subject.findMany({
      select: { subjectId: true, name: true }
    });
    const subjectMap = new Map(allSubjects.map(s => [s.name, s.subjectId]));

    const allSubjectTypes = await prisma.subjectType.findMany({
      select: { subjectTypeId: true, name: true }
    });
    const subjectTypeMap = new Map(allSubjectTypes.map(st => [st.name, st.subjectTypeId]));

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // +1 for header, +1 for 1-based indexing

      try {
        // Validate row data
        const validated = teacherImportSchema.parse(row);

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

        // Validate subjects if provided
        let subjectIds: string[] = [];
        if (validated.subjects && validated.subjects.length > 0) {
          const invalidSubjects = validated.subjects.filter(name => !subjectMap.has(name));
          if (invalidSubjects.length > 0) {
            result.errors.push({
              row: rowNumber,
              errors: [`科目が見つかりません: ${invalidSubjects.join("、")}`]
            });
            continue;
          }
          subjectIds = validated.subjects.map(name => subjectMap.get(name)!);
        }

        // Validate subject types if provided
        let subjectTypeIds: string[] = [];
        if (validated.subjectTypes && validated.subjectTypes.length > 0) {
          const invalidSubjectTypes = validated.subjectTypes.filter(name => !subjectTypeMap.has(name));
          if (invalidSubjectTypes.length > 0) {
            result.errors.push({
              row: rowNumber,
              errors: [`科目タイプが見つかりません: ${invalidSubjectTypes.join("、")}`]
            });
            continue;
          }
          subjectTypeIds = validated.subjectTypes.map(name => subjectTypeMap.get(name)!);
        }

        validatedData.push({
          ...validated,
          subjectIds,
          subjectTypeIds
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
          // Hash password
          const hashedPassword = await bcrypt.hash(data.password, 10);

          // Create user
          const user = await tx.user.create({
            data: {
              username: data.username,
              email: data.email,
              passwordHash: hashedPassword,
              name: data.name,
              role: "TEACHER",
              isRestrictedAdmin: false
            }
          });

          // Create teacher
          await tx.teacher.create({
            data: {
              userId: user.id,
              name: data.name,
              kanaName: data.kanaName || null,
              email: data.email,
              lineId: data.lineId || null,
              notes: data.notes || null,
              status: "ACTIVE"
            }
          });

          // Assign teacher to branch
          await tx.userBranch.create({
            data: {
              userId: user.id,
              branchId: branchId
            }
          });

          // Create subject preferences if provided
          if (data.subjectIds && data.subjectTypeIds && data.subjectIds.length > 0) {
            // Create a preference for each subject with its type
            for (let i = 0; i < data.subjectIds.length; i++) {
              const subjectId = data.subjectIds[i];
              const subjectTypeId = data.subjectTypeIds[i] || data.subjectTypeIds[0]; // Use first type as default if not enough types
              
              await tx.userSubjectPreference.create({
                data: {
                  userId: user.id,
                  subjectId: subjectId,
                  subjectTypeId: subjectTypeId
                }
              });
            }
          }

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
