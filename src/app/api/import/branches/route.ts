import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { CSVParser } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import {
  branchImportSchema,
  REQUIRED_BRANCH_CSV_HEADERS,
  type BranchImportData,
  type ImportResult,
  formatValidationErrors
} from "@/schemas/import";
import { z } from "zod";
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
    const requiredHeaders = [...REQUIRED_BRANCH_CSV_HEADERS];
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
    const validatedData: BranchImportData[] = [];
    const result: ImportResult = {
      success: 0,
      errors: [],
      warnings: []
    };

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // +1 for header, +1 for 1-based indexing

      try {
        // Validate row data
        const validated = branchImportSchema.parse(row);

        // Check if branch with same name already exists
        const existingBranch = await prisma.branch.findFirst({
          where: { name: validated.name }
        });

        if (existingBranch) {
          result.warnings.push({
            row: rowNumber,
            warnings: [`支店「${validated.name}」は既に存在します。スキップしました。`]
          });
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
          await tx.branch.create({
            data: {
              name: data.name,
              notes: data.notes,
              order: data.order
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

export const POST = withBranchAccess(["ADMIN"], handleImport);
