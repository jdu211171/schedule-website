"use client";

import { useState } from "react";
import { CloudUpload, FileSpreadsheet, X, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
// ImportMode removed: unified upsert behavior, no mode selection

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
// Select components no longer used here
import type { ImportResult } from "@/schemas/import";

const formSchema = z.object({
  file: z
    .custom<File>()
    .refine((file) => file instanceof File, {
      message: "ファイルを選択してください",
    })
    .refine((file) => file?.name.endsWith(".csv"), {
      message: "CSVファイルを選択してください",
    })
    .refine((file) => file?.size <= 10 * 1024 * 1024, {
      message: "ファイルサイズは10MB以下にしてください",
    }),
});

type FormValues = z.infer<typeof formSchema>;

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  templateUrl: string;
  importUrl: string;
  onImportComplete?: () => void;
}

export function CSVImportDialog({
  open,
  onOpenChange,
  title,
  description,
  templateUrl,
  importUrl,
  onImportComplete,
}: CSVImportDialogProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormValues) => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", data.file);
      // Import mode no longer required; backend performs upsert

      // Request error CSV attachment in the JSON result when errors occur
      const reqUrl = importUrl.includes("?")
        ? `${importUrl}&return=errors_csv`
        : `${importUrl}?return=errors_csv`;
      const response = await fetch(reqUrl, {
        method: "POST",
        body: formData,
        headers: {
          "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        // Check if the result has the import result structure
        if (result.errors && Array.isArray(result.errors)) {
          // This is a validation result with row-specific errors
          setImportResult(result);
        } else {
          // This is a general error
          const generic = "インポート中にエラーが発生しました";
          const tooMany =
            "リクエストが多すぎます。しばらくしてから再試行してください。";
          const tooLarge = "ファイルサイズが大きすぎます";
          const msg =
            response.status === 429
              ? tooMany
              : response.status === 413
                ? tooLarge
                : result.error || generic;
          throw new Error(msg);
        }
      } else {
        setImportResult(result);
      }

      if (result.errors.length === 0 && result.warnings.length === 0) {
        // Only auto-close if there are no errors AND no warnings
        // Call the completion handler immediately
        onImportComplete?.();
      }
    } catch (error) {
      setImportResult({
        success: 0,
        errors: [
          {
            row: 0,
            errors: [
              error instanceof Error
                ? error.message
                : "インポート中にエラーが発生しました",
            ],
          },
        ],
        warnings: [],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      onOpenChange(false);
      form.reset();
      setImportResult(null);
    }
  };

  // 日本語のみの表記に統一

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {!importResult ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* Import mode selection removed: unified upsert */}

                <FormField
                  control={form.control}
                  name="file"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>CSVファイル</FormLabel>
                      <FormControl>
                        <FileUpload
                          value={value ? [value] : []}
                          onValueChange={(files) => onChange(files[0])}
                          accept=".csv"
                          maxFiles={1}
                          maxSize={10 * 1024 * 1024}
                          onFileReject={(_, message) => {
                            form.setError("file", {
                              message,
                            });
                          }}
                          {...field}
                        >
                          <FileUploadDropzone className="border-2 border-dashed">
                            <div className="flex flex-col items-center justify-center space-y-2 text-center p-6">
                              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                              <div className="text-sm">
                                <span className="font-medium">
                                  CSVファイルをドラッグ&ドロップ
                                </span>
                                <span className="text-muted-foreground">
                                  または
                                </span>
                                <FileUploadTrigger asChild>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0"
                                  >
                                    ファイルを選択
                                  </Button>
                                </FileUploadTrigger>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                CSV形式、最大10MB
                              </p>
                            </div>
                          </FileUploadDropzone>
                          <FileUploadList>
                            {value && (
                              <FileUploadItem value={value}>
                                <FileUploadItemPreview />
                                <FileUploadItemMetadata />
                                <FileUploadItemDelete asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                  >
                                    <X />
                                    <span className="sr-only">削除</span>
                                  </Button>
                                </FileUploadItemDelete>
                              </FileUploadItem>
                            )}
                          </FileUploadList>
                        </FileUpload>
                      </FormControl>
                      <FormDescription>
                        UTF-8またはShift-JISエンコーディングのCSVファイルに対応しています
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Alert>
                  <AlertDescription>
                    <a
                      href={templateUrl}
                      download
                      className="font-medium text-primary hover:underline"
                    >
                      テンプレートCSVをダウンロード
                    </a>
                    して、フォーマットを確認してください。
                  </AlertDescription>
                </Alert>

                <Alert>
                  <AlertDescription className="flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      エクスポートされたCSVには「ID」列が含まれます。
                      <br />
                      ・IDがある行は既存レコードを更新します。
                      <br />
                      ・IDがない行は新規作成します（または重複しない一意キーがある場合は更新します）。
                      <br />
                      例）ブースは「校舎名+ブース名」、科目/科目タイプ/校舎は「名前」で重複チェックします。
                    </span>
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isImporting}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    disabled={isImporting || !form.watch("file")}
                  >
                    {isImporting ? (
                      <>
                        <CloudUpload className="mr-2 h-4 w-4 animate-pulse" />
                        インポート中...
                      </>
                    ) : (
                      <>
                        <CloudUpload className="mr-2 h-4 w-4" />
                        インポート開始
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="summary">サマリー</TabsTrigger>
                  <TabsTrigger
                    value="errors"
                    disabled={importResult.errors.length === 0}
                  >
                    エラー ({importResult.errors.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="warnings"
                    disabled={importResult.warnings.length === 0}
                  >
                    警告 ({importResult.warnings.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    {importResult.success > 0 && (
                      <Alert className="border-green-200 bg-green-50">
                        <AlertDescription className="text-green-800">
                          <span className="font-semibold">
                            {importResult.success}件のデータが処理されました
                          </span>
                          {importResult.created !== undefined &&
                            importResult.created > 0 && (
                              <span className="block mt-1">
                                • {importResult.created}件 新規作成
                              </span>
                            )}
                          {importResult.updated !== undefined &&
                            importResult.updated > 0 && (
                              <span className="block mt-1">
                                • {importResult.updated}件 更新
                              </span>
                            )}
                          {importResult.deleted !== undefined &&
                            importResult.deleted > 0 && (
                              <span className="block mt-1">
                                • {importResult.deleted}件 削除
                              </span>
                            )}
                        </AlertDescription>
                      </Alert>
                    )}
                    {importResult.skipped !== undefined &&
                      importResult.skipped > 0 && (
                        <Alert className="border-blue-200 bg-blue-50">
                          <AlertDescription className="text-blue-800">
                            <span className="font-semibold">
                              {importResult.skipped}件
                            </span>
                            のデータがスキップされました
                          </AlertDescription>
                        </Alert>
                      )}
                    {importResult.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          <span className="font-semibold">
                            {importResult.errors.length}件
                          </span>
                          のエラーが発生しました
                        </AlertDescription>
                      </Alert>
                    )}
                    {importResult.warnings.length > 0 && (
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertDescription className="text-yellow-800">
                          <span className="font-semibold">
                            {importResult.warnings.length}件
                          </span>
                          の警告があります
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="errors" className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    {importResult && (importResult as any).errorCsv && (
                      <a
                        href={(importResult as any).errorCsv as string}
                        download={
                          (importResult as any).errorCsvFilename ||
                          "student_import_errors.csv"
                        }
                        className="text-primary text-sm hover:underline"
                      >
                        エラー行CSVをダウンロード
                      </a>
                    )}
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2 pr-4">
                      {importResult.errors.map((error, index) => (
                        <div
                          key={index}
                          className="rounded-lg border border-red-200 bg-red-50 p-3"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="destructive" className="text-xs">
                              行 {error.row}
                            </Badge>
                          </div>
                          <ul className="list-inside list-disc text-sm text-red-700 space-y-1">
                            {error.errors.map((msg, i) => (
                              <li key={i}>{msg}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="warnings" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2 pr-4">
                      {importResult.warnings.map((warning, index) => (
                        <div
                          key={index}
                          className="rounded-lg border border-yellow-200 bg-yellow-50 p-3"
                        >
                          {warning.row && (
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-yellow-600 text-xs">
                                行 {warning.row}
                              </Badge>
                            </div>
                          )}
                          <ul className="list-inside list-disc text-sm text-yellow-700 space-y-1">
                            {warning.warnings &&
                            Array.isArray(warning.warnings) ? (
                              warning.warnings.map((msg, i) => (
                                <li key={i}>{msg}</li>
                              ))
                            ) : warning.message ? (
                              <li>{warning.message}</li>
                            ) : null}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2">
                {importResult.success > 0 &&
                  importResult.errors.length === 0 && (
                    <Button
                      variant="default"
                      onClick={() => {
                        handleClose();
                        onImportComplete?.();
                      }}
                    >
                      閉じて更新
                    </Button>
                  )}
                {importResult.errors.length > 0 && (
                  <Button variant="outline" onClick={handleClose}>
                    閉じる
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
