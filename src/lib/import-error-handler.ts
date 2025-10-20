import { NextResponse } from "next/server";

export function handleImportError(error: unknown) {
  console.error("Import error:", error);

  // Handle Prisma validation errors with more user-friendly messages
  if (error instanceof Error) {
    if (error.name === "PrismaClientValidationError") {
      // Extract the specific field that's missing or invalid
      const missingFieldMatch = error.message.match(
        /Argument `(\w+)` is missing/
      );
      if (missingFieldMatch) {
        return NextResponse.json(
          {
            error: `必須フィールド「${missingFieldMatch[1]}」がインポートデータにありません`,
          },
          { status: 400 }
        );
      }

      // Handle unknown field errors
      const unknownFieldMatch = error.message.match(/Unknown field `(\w+)`/);
      if (unknownFieldMatch) {
        return NextResponse.json(
          {
            error: `不明なフィールド「${unknownFieldMatch[1]}」がインポートデータに含まれています。CSVヘッダーがテンプレートと一致しているか確認してください。`,
          },
          { status: 400 }
        );
      }

      // Handle invalid value errors
      const invalidValueMatch = error.message.match(
        /Invalid value for argument `(\w+)`/
      );
      if (invalidValueMatch) {
        return NextResponse.json(
          {
            error: `フィールド「${invalidValueMatch[1]}」の値が不正です。データ形式を確認してください。`,
          },
          { status: 400 }
        );
      }

      // Generic validation error
      return NextResponse.json(
        {
          error:
            "データ形式が不正です。CSVファイルが必要なテンプレート形式と一致しているか確認してください。",
        },
        { status: 400 }
      );
    }

    // Handle unique constraint violations
    if (error.message.includes("Unique constraint")) {
      const uniqueFieldMatch = error.message.match(/fields: \(`([^`]+)`\)/);
      if (uniqueFieldMatch) {
        return NextResponse.json(
          {
            error: `「${uniqueFieldMatch[1]}」に重複した値が見つかりました。この値は一意である必要があります。`,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error:
            "重複データが見つかりました。一部のレコードは既にデータベースに存在している可能性があります。",
        },
        { status: 400 }
      );
    }

    // Handle foreign key constraint violations
    if (error.message.includes("Foreign key constraint")) {
      return NextResponse.json(
        {
          error:
            "無効な参照が見つかりました。参照されているデータ（校舎、科目など）がシステムに存在することを確認してください。",
        },
        { status: 400 }
      );
    }

    // Handle null constraint violations
    if (error.message.includes("null constraint")) {
      const nullFieldMatch = error.message.match(/column "(\w+)"/);
      if (nullFieldMatch) {
        return NextResponse.json(
          {
            error: `必須フィールド「${nullFieldMatch[1]}」は空にできません。`,
          },
          { status: 400 }
        );
      }
    }
  }

  // Generic error response
  return NextResponse.json(
    {
      error:
        "インポート中に予期しないエラーが発生しました。データを確認して、もう一度お試しください。",
    },
    { status: 500 }
  );
}
