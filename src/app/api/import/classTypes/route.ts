import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { CSVParser } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import {
  classTypeImportSchema,
  REQUIRED_CLASS_TYPE_CSV_HEADERS,
  type ClassTypeImportData,
  type ImportResult,
  formatValidationErrors
} from "@/schemas/import";
import { z } from "zod";
import { handleImportError } from "@/lib/import-error-handler";

async function handleImport(req: NextRequest, session: any) {
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
    const requiredHeaders = [...REQUIRED_CLASS_TYPE_CSV_HEADERS];
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
    const validatedData: (ClassTypeImportData & { parentId?: string })[] = [];
    const result: ImportResult = {
      success: 0,
      errors: [],
      warnings: []
    };

    // Create a map of class type names to IDs for parent lookup
    const existingClassTypes = await prisma.classType.findMany({
      select: { classTypeId: true, name: true }
    });
    const classTypeMap = new Map(existingClassTypes.map(ct => [ct.name, ct.classTypeId]));

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // +1 for header, +1 for 1-based indexing

      try {
        // Validate row data
        const validated = classTypeImportSchema.parse(row);

        // Check if parent exists (if specified)
        let parentId: string | undefined;
        if (validated.parentName) {
          parentId = classTypeMap.get(validated.parentName);
          if (!parentId) {
            result.errors.push({
              row: rowNumber,
              errors: [`親クラスタイプ「${validated.parentName}」が見つかりません`]
            });
            continue;
          }
        }

        // Check if class type with same name already exists
        const existingClassType = await prisma.classType.findFirst({
          where: { name: validated.name }
        });

        if (existingClassType) {
          result.warnings.push({
            row: rowNumber,
            warnings: [`クラスタイプ「${validated.name}」は既に存在します。スキップしました。`]
          });
          continue;
        }

        validatedData.push({
          ...validated,
          parentId
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
    // We need to handle hierarchical data carefully - parents must be created before children
    if (validatedData.length > 0) {
      await prisma.$transaction(async (tx) => {
        // First, create all class types without parents
        const withoutParent = validatedData.filter(d => !d.parentId);
        for (const data of withoutParent) {
          const created = await tx.classType.create({
            data: {
              name: data.name,
              notes: data.notes,
              order: data.order
            }
          });
          // Update the map for subsequent parent lookups
          classTypeMap.set(created.name, created.classTypeId);
          result.success++;
        }

        // Then, create class types with parents
        const withParent = validatedData.filter(d => d.parentId);
        for (const data of withParent) {
          // Re-check parent ID in case it was just created
          let parentId = data.parentId;
          if (!parentId && data.parentName) {
            parentId = classTypeMap.get(data.parentName);
          }

          await tx.classType.create({
            data: {
              name: data.name,
              notes: data.notes,
              parentId: parentId,
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

export const POST = withRole(["ADMIN", "STAFF"], handleImport);
