import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { CSVParser } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import {
  studentImportSchema,
  studentUpdateImportSchema,
  type StudentImportData,
  type StudentUpdateImportData,
  type ImportResult,
  formatValidationErrors,
} from "@/schemas/import";
import { STUDENT_COLUMN_RULES, csvHeaderToDbField } from "@/schemas/import/student-column-rules";
import { z } from "zod";
import { handleImportError } from "@/lib/import-error-handler";
// ImportMode not used in strict variant

async function handleImport(req: NextRequest, session: any, branchId: string) {
  try {
    // Get the form data
    const formData = await req.formData();
    const file = formData.get("file");
    // Strict variant: row-level decision by presence of ID; no importMode

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "ファイルが選択されていません" },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await (file as Blob).arrayBuffer());

    // Parse CSV file with encoding detection
    const parseResult =
      await CSVParser.parseBuffer<Record<string, string>>(buffer, {
        encoding: "utf-8", // Default to UTF-8, but the parser will auto-detect if needed
      });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: "CSVファイルの解析に失敗しました",
          details: parseResult.errors,
        },
        { status: 400 },
      );
    }

    // Validate CSV headers
    if (parseResult.data.length === 0) {
      return NextResponse.json(
        { error: "CSVファイルが空です" },
        { status: 400 },
      );
    }

    const actualHeaders = Object.keys(parseResult.data[0]);

    // Process and validate each row
    const validatedData: ((StudentImportData | StudentUpdateImportData) & {
      studentTypeId?: string | null;
      branchIds?: string[];
      existingUserId?: string;
      fieldsInRow?: Set<string>;
      rowNumber: number;
    })[] = [];
    const result: ImportResult = {
      success: 0,
      errors: [],
      warnings: [],
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
    };

    // Pre-fetch all student types and subjects for validation
    const allStudentTypes = await prisma.studentType.findMany({
      select: { studentTypeId: true, name: true, maxYears: true },
    });
    const studentTypeMap = new Map(allStudentTypes.map((st) => [st.name, st]));

    const allSubjects = await prisma.subject.findMany({
      select: { subjectId: true, name: true },
    });
    const subjectMap = new Map(allSubjects.map((s) => [s.name, s.subjectId]));

    const allBranches = await prisma.branch.findMany({
      select: { branchId: true, name: true },
    });
    const branchMap = new Map(allBranches.map((b) => [b.name, b.branchId]));

    // Map CSV headers to DB fields for processing
    const headerMapping: Record<string, string> = {};
    for (const header of actualHeaders) {
      const dbField = csvHeaderToDbField(header);
      if (dbField) {
        headerMapping[header] = dbField;
      }
    }

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // +1 for header, +1 for 1-based indexing

      try {
        // Map CSV data to DB fields and filter ignored columns
        const filteredRow: Record<string, string> = {};
        const fieldsInRow: Set<string> = new Set();

        for (const [csvHeader, csvValue] of Object.entries(row)) {
          const dbField = headerMapping[csvHeader];
          if (!dbField) continue;

          const rule = Object.values(STUDENT_COLUMN_RULES).find(r => r.dbField === dbField);
          if (!rule) continue;

          // Skip columns marked ignore for both create and update
          if (rule.createRule === 'ignore' && rule.updateRule === 'ignore') continue;

          // Map to internal field name for schema validation
          filteredRow[dbField] = csvValue;
          fieldsInRow.add(dbField);
        }

        // Validate row data with filtered columns using appropriate schema
        const importStudentId = ((row as any).id || (row as any).ID) as string | undefined;
        const isUpdateRow = !!importStudentId;
        const validated = isUpdateRow
          ? studentUpdateImportSchema.parse(filteredRow)
          : studentImportSchema.parse(filteredRow);

        // Validate student type (only if provided)
        let studentType = null;
        if (validated.studentTypeName) {
          studentType = studentTypeMap.get(validated.studentTypeName);
          if (!studentType) {
            result.errors.push({
              row: rowNumber,
              errors: [
                `学生タイプ「${validated.studentTypeName}」が見つかりません`,
              ],
            });
            continue;
          }

          // Validate grade year against student type max years
          if (
            studentType.maxYears !== null &&
            validated.gradeYear &&
            validated.gradeYear > studentType.maxYears
          ) {
            result.errors.push({
              row: rowNumber,
              errors: [
                `学年${validated.gradeYear}は学生タイプ「${validated.studentTypeName}」の最大学年${studentType.maxYears}を超えています`,
              ],
            });
            continue;
          }
        }

        // Validate branches
        let branchIds: string[] = [];
        if (validated.branches && validated.branches.length > 0) {
          const invalidBranches = validated.branches.filter(
            (name) => !branchMap.has(name),
          );
          if (invalidBranches.length > 0) {
            result.errors.push({
              row: rowNumber,
              errors: [`校舎が見つかりません: ${invalidBranches.join(", ")}`],
            });
            continue;
          }
          branchIds = validated.branches.map((name) => branchMap.get(name)!);
        } else if (!isUpdateRow) {
          // Default to current branch when creating and branches not provided
          if (branchId) branchIds = [branchId];
        }

        // Decide create vs update strictly by presence of ID
        validatedData.push({
          ...validated,
          studentTypeId: studentType?.studentTypeId || null,
          branchIds,
          fieldsInRow,
          rowNumber,
          ...(isUpdateRow ? { studentId: importStudentId } : {} as any),
        } as any);
      } catch (error) {
        if (error instanceof z.ZodError) {
          result.errors.push(formatValidationErrors(error.errors, rowNumber));
        } else {
          result.errors.push({
            row: rowNumber,
            errors: [
              error instanceof Error
                ? error.message
                : "データ検証中にエラーが発生しました",
            ],
          });
        }
      }
    }

    // If there are critical errors, don't proceed with import
    if (result.errors.length > 0 && validatedData.length === 0) {
      return NextResponse.json(result, { status: 400 });
    }

    // Import valid data in batches to avoid long transactions/timeouts
    if (validatedData.length > 0) {
      const batchSize = 100;
      for (let start = 0; start < validatedData.length; start += batchSize) {
        const batch = validatedData.slice(start, start + batchSize);
        await prisma.$transaction(async (tx) => {
          for (const data of batch) {
            if ((data as any).studentId) {
              // Strict update by ID; only update fields present in the row
              const fieldsInRow = data.fieldsInRow || new Set();
              const userUpdates: any = {};
              if (fieldsInRow.has("email")) userUpdates.email = data.email ?? null;
              if (fieldsInRow.has("name")) userUpdates.name = data.name ?? null;
              if (fieldsInRow.has("password") && data.password && data.password.trim() !== "") {
                userUpdates.passwordHash = data.password;
              }

              const studentUpdates: any = {};
              if (fieldsInRow.has("name")) studentUpdates.name = data.name || null;
              if (fieldsInRow.has("kanaName")) studentUpdates.kanaName = data.kanaName || null;
              if (fieldsInRow.has("studentTypeName") && data.studentTypeId) studentUpdates.studentTypeId = data.studentTypeId;
              if (fieldsInRow.has("gradeYear")) studentUpdates.gradeYear = data.gradeYear;
              if (fieldsInRow.has("notes")) studentUpdates.notes = data.notes || null;
              if (fieldsInRow.has("schoolName")) studentUpdates.schoolName = data.schoolName || null;
              if (fieldsInRow.has("schoolType")) studentUpdates.schoolType = data.schoolType || null;
              if (fieldsInRow.has("examCategory")) studentUpdates.examCategory = data.examCategory || null;
              if (fieldsInRow.has("examCategoryType")) studentUpdates.examCategoryType = data.examCategoryType || null;
              if (fieldsInRow.has("firstChoice")) studentUpdates.firstChoice = data.firstChoice || null;
              if (fieldsInRow.has("secondChoice")) studentUpdates.secondChoice = data.secondChoice || null;
              if (fieldsInRow.has("examDate")) studentUpdates.examDate = data.examDate || null;
              if (fieldsInRow.has("parentEmail")) studentUpdates.parentEmail = data.parentEmail || null;
              if (fieldsInRow.has("birthDate")) studentUpdates.birthDate = data.birthDate || null;
              if (fieldsInRow.has("lineId")) studentUpdates.lineId = data.lineId || null;

              try {
                const updated = await tx.student.update({
                  where: { studentId: (data as any).studentId },
                  data: {
                    ...studentUpdates,
                    ...(Object.keys(userUpdates).length > 0 ? { user: { update: userUpdates } } : {}),
                  },
                  select: { userId: true },
                });

                if (fieldsInRow.has("branches") && data.branchIds) {
                  await tx.userBranch.deleteMany({ where: { userId: updated.userId } });
                  if (data.branchIds.length > 0) {
                    for (const bId of data.branchIds) {
                      await tx.userBranch.create({ data: { userId: updated.userId, branchId: bId } });
                    }
                  } else {
                    await tx.userBranch.create({ data: { userId: updated.userId, branchId } });
                  }
                }
                result.updated!++;
              } catch (e) {
                result.errors.push({ row: data.rowNumber, errors: ["指定されたIDの生徒が見つかりません"] });
                continue;
              }
            } else {
            // Create new student
            // For create mode, password is optional - generate a default if not provided
            let hashedPassword: string;
            if (data.password && data.password.trim() !== "") {
              // For students, use the password directly (no hashing)
              // NOTE: This is a security risk - passwords should normally be hashed
              hashedPassword = data.password;
            } else {
              // Generate a default password if not provided
              const defaultPassword = `${data.username}@123`;
              // Use default password directly without hashing
              hashedPassword = defaultPassword;
              result.warnings.push({
                message: `行 ${data.rowNumber}: パスワードが指定されていないため、デフォルトパスワード（${defaultPassword}）を設定しました`,
                type: "default_password",
              });
            }

            // Create user + student in try/catch to keep batch going on constraint errors
            try {
              // Create user
              const user = await tx.user.create({
                data: {
                  username: data.username,
                  email: data.email || null,
                  passwordHash: hashedPassword,
                  name: data.name!,
                  role: "STUDENT",
                  isRestrictedAdmin: false,
                },
              });

              // Create student with all fields
              await tx.student.create({
                data: {
                  userId: user.id,
                  name: data.name!,
                  kanaName: data.kanaName || null,
                  studentTypeId: data.studentTypeId || null,
                  gradeYear: data.gradeYear || null,
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
                  parentEmail: data.parentEmail || null,
                  // Personal information
                  birthDate: data.birthDate || null,
                },
              });

              // Assign student to branches
              if (data.branchIds && data.branchIds.length > 0) {
                // Use branches from CSV
                for (const branchId of data.branchIds) {
                  await tx.userBranch.create({
                    data: {
                      userId: user.id,
                      branchId: branchId,
                    },
                  });
                }
              } else {
                // Default to current branch if no branches specified
                await tx.userBranch.create({
                  data: {
                    userId: user.id,
                    branchId: branchId,
                  },
                });
              }

              result.created!++;
            } catch (e: any) {
              result.errors.push({ row: data.rowNumber, errors: ["新規作成中にエラーが発生しました（重複や無効な値の可能性）"] });
              continue;
            }
          }

          result.success++;
        }
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleImportError(error);
  }
}

export const POST = withBranchAccess(["ADMIN", "STAFF"], handleImport);
