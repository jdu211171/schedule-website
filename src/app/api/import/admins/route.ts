import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { CSVParser } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import {
  adminImportSchema,
  REQUIRED_ADMIN_CSV_HEADERS,
  type AdminImportData,
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

    // Remap localized headers (export) to schema keys for import
    const headerMap: Record<string, string> = {
      "ID": "id",
      "ユーザー名": "username",
      "メールアドレス": "email",
      "パスワード": "password",
      "名前": "name",
      "制限付き管理者": "isRestrictedAdmin",
      "所属校舎": "branchNames",
    };

    let actualHeaders = Object.keys(parseResult.data[0]);
    const requiredHeaders = [...REQUIRED_ADMIN_CSV_HEADERS];
    let missingHeaders = requiredHeaders.filter((h) => !actualHeaders.includes(h));

    if (missingHeaders.length > 0) {
      const canRemap = actualHeaders.some((h) => headerMap[h]);
      if (canRemap) {
        parseResult.data = parseResult.data.map((row) => {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) {
            const key = headerMap[k] ?? k;
            let value = (v as string) ?? "";
            if (key === "branchNames") {
              value = value.replace(/、/g, ",");
            }
            out[key] = value;
          }
          return out;
        }) as any;
        actualHeaders = Object.keys(parseResult.data[0]);
        missingHeaders = requiredHeaders.filter((h) => !actualHeaders.includes(h));
      }
    }

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `必須列が不足しています: ${missingHeaders.join(", ")}` },
        { status: 400 }
      );
    }

    // Process and validate each row
    const validatedData: AdminImportData[] = [];
    const result: ImportResult = {
      success: 0,
      errors: [],
      warnings: []
    };

    // Pre-fetch all branches for validation
    const allBranches = await prisma.branch.findMany({
      select: { branchId: true, name: true }
    });
    const branchMap = new Map(allBranches.map(b => [b.name, b.branchId]));

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // +1 for header, +1 for 1-based indexing

      try {
        const id = (row as any).id as string | undefined;

        // Validate row data
        const validated = adminImportSchema.parse(row);

        // Validate branch names if provided
        if (validated.branchNames && validated.branchNames.length > 0) {
          const invalidBranches = validated.branchNames.filter(name => !branchMap.has(name));
          if (invalidBranches.length > 0) {
            result.errors.push({ row: rowNumber, errors: [`支店が見つかりません: ${invalidBranches.join(", ")}`] });
            continue;
          }
        }

        if (id) {
          const existingUser = await prisma.user.findUnique({ where: { id } });
          if (existingUser) {
            await prisma.user.update({
              where: { id },
              data: {
                username: validated.username,
                email: validated.email,
                name: validated.name,
                isRestrictedAdmin: validated.isRestrictedAdmin,
              },
            });

            if (validated.branchNames && validated.branchNames.length > 0) {
              await prisma.userBranch.deleteMany({ where: { userId: id } });
              const branchIds = validated.branchNames.map(name => branchMap.get(name)).filter((x): x is string => !!x);
              if (branchIds.length > 0) {
                await prisma.userBranch.createMany({ data: branchIds.map(branchId => ({ userId: id, branchId })) });
              }
            }

            result.success++;
            continue;
          }
        }

        // No ID: enforce uniqueness then create later
        const conflict = await prisma.user.findFirst({ where: { OR: [{ username: validated.username }, { email: validated.email }] } });
        if (conflict) {
          result.errors.push({ row: rowNumber, errors: [
            conflict.username === validated.username ? `ユーザー名「${validated.username}」は既に使用されています` : `メールアドレス「${validated.email}」は既に使用されています`
          ]});
          continue;
        }

        validatedData.push(validated);
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
              role: data.isRestrictedAdmin ? "ADMIN" : "ADMIN",
              isRestrictedAdmin: data.isRestrictedAdmin
            }
          });

          // Assign branches if provided
          if (data.branchNames && data.branchNames.length > 0) {
            const branchIds = data.branchNames
              .map(name => branchMap.get(name))
              .filter((id): id is string => id !== undefined);

            await tx.userBranch.createMany({
              data: branchIds.map(branchId => ({
                userId: user.id,
                branchId
              }))
            });
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

export const POST = withBranchAccess(["ADMIN"], handleImport);
