import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { CSVParser } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import {
  teacherImportSchema,
  teacherUpdateImportSchema,
  TEACHER_CSV_HEADERS,
  REQUIRED_TEACHER_CSV_HEADERS,
  type TeacherImportData,
  type TeacherUpdateImportData,
  type ImportResult,
  formatValidationErrors,
} from "@/schemas/import";
import {
  TEACHER_COLUMN_RULES,
  getRequiredFields,
  csvHeaderToDbField
} from "@/schemas/import/teacher-column-rules";
import { z } from "zod";
import { handleImportError } from "@/lib/import-error-handler";
import { ImportMode } from "@/types/import";

async function handleImport(req: NextRequest, session: any, branchId: string) {
  try {
    // Get the form data
    const formData = await req.formData();
    const file = formData.get("file");
    const importMode =
      (formData.get("importMode") as ImportMode) || ImportMode.CREATE_ONLY;

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

    // Get required headers based on import mode and column rules
    const isUpdateMode = importMode === ImportMode.UPDATE_ONLY;
    const requiredFields = getRequiredFields(isUpdateMode ? 'update' : 'create');
    const requiredHeaders = requiredFields
      .map(field => TEACHER_COLUMN_RULES[field]?.csvHeader)
      .filter(Boolean) as string[];

    const missingHeaders = requiredHeaders.filter(
      (h) => !actualHeaders.includes(h),
    );

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: `必須列が不足しています: ${missingHeaders.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Process and validate each row
    const validatedData: ((TeacherImportData | TeacherUpdateImportData) & {
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

    // Pre-fetch all branches for validation
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

          const rule = Object.values(TEACHER_COLUMN_RULES).find(r => r.dbField === dbField);
          if (!rule) continue;

          // Skip ignored columns
          const ruleType = isUpdateMode ? rule.updateRule : rule.createRule;
          if (ruleType === 'ignore') continue;

          // Map to internal field name for schema validation
          filteredRow[dbField] = csvValue;
          fieldsInRow.add(dbField);
        }

        // Validate row data with filtered columns using appropriate schema
        const validated =
          importMode === ImportMode.UPDATE_ONLY
            ? teacherUpdateImportSchema.parse(filteredRow)
            : teacherImportSchema.parse(filteredRow);

        // Check if user with same username or email already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { username: validated.username },
              ...(validated.email ? [{ email: validated.email }] : []),
            ],
          },
          include: {
            teacher: true,
          },
        });

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
        } else if (!isUpdateMode && !existingUser) {
          // Branches are required for create mode if no existing user
          branchIds = [branchId]; // Default to current branch
        }

        // Handle based on import mode
        if (existingUser) {
          if (importMode === ImportMode.CREATE_ONLY) {
            result.skipped!++;
            continue;
          } else if (
            importMode === ImportMode.UPDATE_ONLY
          ) {
            // For updates, user must be a teacher
            if (!existingUser.teacher) {
              result.errors.push({
                row: rowNumber,
                errors: [
                  `ユーザー「${existingUser.username}」は講師ではありません`,
                ],
              });
              continue;
            }
            // Mark for update
            validatedData.push({
              ...validated,
              branchIds,
              existingUserId: existingUser.id,
              fieldsInRow,
              rowNumber,
            });
          }
        } else {
          // No existing user
          if (importMode === ImportMode.UPDATE_ONLY) {
            result.skipped!++;
            continue;
          }
          // CREATE_ONLY will create new records
          validatedData.push({
            ...validated,
            branchIds,
            fieldsInRow,
            rowNumber,
          });
        }
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

    // Import valid data in a transaction
    if (validatedData.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const data of validatedData) {
          if (data.existingUserId) {
            // Update existing teacher
            const existingTeacher = await tx.teacher.findUnique({
              where: { userId: data.existingUserId },
              include: { user: true },
            });

            if (!existingTeacher) {
              continue; // Should not happen
            }

            // Update user fields if provided
            const userUpdates: any = {};
            const fieldsInRow = data.fieldsInRow || new Set();

            if (
              fieldsInRow.has("email") &&
              data.email !== existingTeacher.user.email
            ) {
              userUpdates.email = data.email;
            }
            if (
              fieldsInRow.has("name") &&
              data.name !== existingTeacher.user.name
            ) {
              userUpdates.name = data.name;
            }
            // Only update password if explicitly provided in CSV with a non-empty value
            if (
              fieldsInRow.has("password") &&
              data.password &&
              data.password.trim() !== ""
            ) {
              // For teachers, use the password directly (no hashing)
              userUpdates.passwordHash = data.password;
            }

            if (Object.keys(userUpdates).length > 0) {
              await tx.user.update({
                where: { id: data.existingUserId },
                data: userUpdates,
              });
            }

            // Update teacher fields - only update fields that were present in the CSV
            const teacherUpdates: any = {};
            const fields = data.fieldsInRow || new Set();

            // Only update fields that were present in the CSV row
            if (fields.has("name")) teacherUpdates.name = data.name || null;
            if (fields.has("kanaName"))
              teacherUpdates.kanaName = data.kanaName || null;
            if (fields.has("notes")) teacherUpdates.notes = data.notes || null;
            if (fields.has("birthDate"))
              teacherUpdates.birthDate = data.birthDate || null;
            // Skip phoneNumber and phoneNotes as they are now ignored in import

            // LINE ID - update if provided
            if (fields.has("lineId"))
              teacherUpdates.lineId = data.lineId || null;

            await tx.teacher.update({
              where: { userId: data.existingUserId },
              data: teacherUpdates,
            });

            // Update branch assignments if provided
            if (fields.has("branches") && data.branchIds) {
              // Remove existing branch assignments
              await tx.userBranch.deleteMany({
                where: { userId: data.existingUserId },
              });

              // Add new branch assignments
              if (data.branchIds.length > 0) {
                for (const branchId of data.branchIds) {
                  await tx.userBranch.create({
                    data: {
                      userId: data.existingUserId,
                      branchId: branchId,
                    },
                  });
                }
              } else {
                // If branches field was empty, assign to current branch
                await tx.userBranch.create({
                  data: {
                    userId: data.existingUserId,
                    branchId: branchId,
                  },
                });
              }
            }

            result.updated!++;
          } else {
            // Create new teacher
            // For create mode, password is optional - generate a default if not provided
            let hashedPassword: string;
            if (data.password && data.password.trim() !== "") {
              // For teachers, use the password directly (no hashing)
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

            // Create user
            const user = await tx.user.create({
              data: {
                username: data.username,
                email: data.email || null,
                passwordHash: hashedPassword,
                name: data.name!,
                role: "TEACHER",
                isRestrictedAdmin: false,
              },
            });

            // Create teacher with all fields
            await tx.teacher.create({
              data: {
                userId: user.id,
                name: data.name!,
                kanaName: data.kanaName || null,
                email: data.email || null,
                lineId: data.lineId || null,
                notes: data.notes || null,
                status: "ACTIVE",
                birthDate: data.birthDate || null,
                // phoneNumber and phoneNotes are ignored in import
                lineNotificationsEnabled: true,
              },
            });

            // Assign teacher to branches
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
