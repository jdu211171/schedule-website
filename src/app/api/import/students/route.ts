import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { CSVParser } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import {
  studentImportSchema,
  studentUpdateImportSchema,
  STUDENT_CSV_HEADERS,
  REQUIRED_STUDENT_CSV_HEADERS,
  type StudentImportData,
  type StudentUpdateImportData,
  type ImportResult,
  formatValidationErrors,
} from "@/schemas/import";
import {
  STUDENT_COLUMN_RULES,
  getRequiredFields,
  csvHeaderToDbField
} from "@/schemas/import/student-column-rules";
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
      .map(field => STUDENT_COLUMN_RULES[field]?.csvHeader)
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

        // Check if user with same username or email already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { username: validated.username },
              ...(validated.email ? [{ email: validated.email }] : []),
            ],
          },
          include: {
            student: true,
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
          // Branches are required for create mode
          result.errors.push({
            row: rowNumber,
            errors: [`校舎は必須項目です`],
          });
          continue;
        }

        // Handle based on import mode
        if (existingUser) {
          if (importMode === ImportMode.CREATE_ONLY) {
            result.skipped!++;
            continue;
          } else if (
            importMode === ImportMode.UPDATE_ONLY
          ) {
            // For updates, user must be a student
            if (!existingUser.student) {
              result.errors.push({
                row: rowNumber,
                errors: [
                  `ユーザー「${existingUser.username}」は学生ではありません`,
                ],
              });
              continue;
            }
            // Mark for update
            validatedData.push({
              ...validated,
              studentTypeId: studentType?.studentTypeId || null,
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
            studentTypeId: studentType?.studentTypeId || null,
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
            // Update existing student
            const existingStudent = await tx.student.findUnique({
              where: { userId: data.existingUserId },
              include: { user: true },
            });

            if (!existingStudent) {
              continue; // Should not happen
            }

            // Update user fields if provided
            const userUpdates: any = {};
            const fieldsInRow = data.fieldsInRow || new Set();

            if (
              fieldsInRow.has("email") &&
              data.email !== existingStudent.user.email
            ) {
              userUpdates.email = data.email;
            }
            if (
              fieldsInRow.has("name") &&
              data.name !== existingStudent.user.name
            ) {
              userUpdates.name = data.name;
            }
            // Only update password if explicitly provided in CSV with a non-empty value
            if (
              fieldsInRow.has("password") &&
              data.password &&
              data.password.trim() !== ""
            ) {
              // For students, use the password directly (no hashing)
              // NOTE: This is a security risk - passwords should normally be hashed
              userUpdates.passwordHash = data.password;
            }

            if (Object.keys(userUpdates).length > 0) {
              await tx.user.update({
                where: { id: data.existingUserId },
                data: userUpdates,
              });
            }

            // Update student fields - only update fields that were present in the CSV
            const studentUpdates: any = {};
            const fields = data.fieldsInRow || new Set();

            // Only update fields that were present in the CSV row
            if (fields.has("name")) studentUpdates.name = data.name || null;
            if (fields.has("kanaName"))
              studentUpdates.kanaName = data.kanaName || null;
            if (fields.has("studentTypeName") && data.studentTypeId)
              studentUpdates.studentTypeId = data.studentTypeId;
            if (fields.has("gradeYear"))
              studentUpdates.gradeYear = data.gradeYear;
            if (fields.has("notes")) studentUpdates.notes = data.notes || null;

            // School information
            if (fields.has("schoolName"))
              studentUpdates.schoolName = data.schoolName || null;
            if (fields.has("schoolType"))
              studentUpdates.schoolType = data.schoolType || null;

            // Exam information
            if (fields.has("examCategory"))
              studentUpdates.examCategory = data.examCategory || null;
            if (fields.has("examCategoryType"))
              studentUpdates.examCategoryType = data.examCategoryType || null;
            if (fields.has("firstChoice"))
              studentUpdates.firstChoice = data.firstChoice || null;
            if (fields.has("secondChoice"))
              studentUpdates.secondChoice = data.secondChoice || null;
            if (fields.has("examDate"))
              studentUpdates.examDate = data.examDate || null;

            // Contact information
            if (fields.has("parentEmail"))
              studentUpdates.parentEmail = data.parentEmail || null;

            // Personal information
            if (fields.has("birthDate"))
              studentUpdates.birthDate = data.birthDate || null;

            // LINE ID - update if provided
            if (fields.has("lineId"))
              studentUpdates.lineId = data.lineId || null;

            await tx.student.update({
              where: { userId: data.existingUserId },
              data: studentUpdates,
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
