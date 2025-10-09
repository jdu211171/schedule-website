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
          const lang = (typeof navigator !== 'undefined' ? navigator.language : 'ja').toLowerCase();
          const isEn = lang.startsWith('en');
          const generic = isEn ? 'An error occurred during import' : 'インポート中にエラーが発生しました';
          const tooMany = isEn ? 'Too many requests. Try again later.' : 'リクエストが多すぎます。しばらくしてから再試行してください。';
          const tooLarge = isEn ? 'File too large' : 'ファイルサイズが大きすぎます';
          const msg = (response.status === 429 ? tooMany : (response.status === 413 ? tooLarge : (result.error || generic)));
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
        errors: [{
          row: 0,
          errors: [error instanceof Error ? error.message : "インポート中にエラーが発生しました"]
        }],
        warnings: []
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

  const lang = (typeof navigator !== 'undefined' ? navigator.language : 'ja').toLowerCase();
  const isEn = lang.startsWith('en');
  const t = {
    selectFile: isEn ? 'Select file' : 'ファイルを選択',
    csvFile: isEn ? 'CSV File' : 'CSVファイル',
    csvHint: isEn ? 'CSV format, up to 10MB' : 'CSV形式、最大10MB',
    downloadTemplate: isEn ? 'Download template CSV' : 'テンプレートCSVをダウンロード',
    infoTitle: isEn ? 'Info' : '情報',
    idRules: isEn ? 'Exported CSV includes an "ID" column. Rows with ID update existing records; rows without ID create new records.' : 'エクスポートされたCSVには「ID」列が含まれます。IDがある行は更新、IDがない行は新規作成します。',
    cancel: isEn ? 'Cancel' : 'キャンセル',
    startImport: isEn ? 'Start import' : 'インポート開始',
    importing: isEn ? 'Importing…' : 'インポート中...',
    summary: isEn ? 'Summary' : 'サマリー',
    errors: isEn ? 'Errors' : 'エラー',
    warnings: isEn ? 'Warnings' : '警告',
    rowsProcessed: (n: number) => isEn ? `${n} rows processed` : `${n}件のデータが処理されました`,
    created: (n: number) => isEn ? `• ${n} created` : `• ${n}件 新規作成`,
    updated: (n: number) => isEn ? `• ${n} updated` : `• ${n}件 更新`,
    deleted: (n: number) => isEn ? `• ${n} deleted` : `• ${n}件 削除`,
    skipped: (n: number) => isEn ? `${n} rows skipped` : `${n}件のデータがスキップされました`,
    errorCount: (n: number) => isEn ? `${n} errors occurred` : `${n}件のエラーが発生しました`,
    warningCount: (n: number) => isEn ? `${n} warnings` : `${n}件の警告があります`,
    closeAndRefresh: isEn ? 'Close and refresh' : '閉じて更新',
    close: isEn ? 'Close' : '閉じる',
    row: isEn ? 'Row' : '行',
    downloadErrorCsv: isEn ? 'Download error rows CSV' : 'エラー行CSVをダウンロード',
  };

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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Import mode selection removed: unified upsert */}

                <FormField
                  control={form.control}
                  name="file"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>{t.csvFile}</FormLabel>
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
                                <span className="font-medium">{isEn ? 'Drag & drop a CSV' : 'CSVファイルをドラッグ&ドロップ'}</span>
                                <span className="text-muted-foreground">{isEn ? 'or' : 'または'}</span>
                                <FileUploadTrigger asChild>
                                  <Button variant="link" size="sm" className="h-auto p-0">
                                    {t.selectFile}
                                  </Button>
                                </FileUploadTrigger>
                              </div>
                              <p className="text-xs text-muted-foreground">{t.csvHint}</p>
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
                                    <span className="sr-only">{isEn ? 'Delete' : '削除'}</span>
                                  </Button>
                                </FileUploadItemDelete>
                              </FileUploadItem>
                            )}
                          </FileUploadList>
                        </FileUpload>
                      </FormControl>
                      <FormDescription>
                        {isEn ? 'Supports CSV encoded as UTF-8 or Shift_JIS' : 'UTF-8またはShift-JISエンコーディングのCSVファイルに対応しています'}
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
                      {t.downloadTemplate}
                    </a>
                    {isEn ? ' to check the format.' : 'して、フォーマットを確認してください。'}
                  </AlertDescription>
                </Alert>

                <Alert>
                  <AlertDescription className="flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span dangerouslySetInnerHTML={{ __html: t.idRules.replace(/\n/g, '<br />') }} />
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isImporting}
                  >
                    {t.cancel}
                  </Button>
                  <Button type="submit" disabled={isImporting || !form.watch("file")}>
                    {isImporting ? (
                      <>
                        <CloudUpload className="mr-2 h-4 w-4 animate-pulse" />
                        {t.importing}
                      </>
                    ) : (
                      <>
                        <CloudUpload className="mr-2 h-4 w-4" />
                        {t.startImport}
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
                  <TabsTrigger value="summary">{t.summary}</TabsTrigger>
                  <TabsTrigger value="errors" disabled={importResult.errors.length === 0}>
                    {t.errors} ({importResult.errors.length})
                  </TabsTrigger>
                  <TabsTrigger value="warnings" disabled={importResult.warnings.length === 0}>
                    {t.warnings} ({importResult.warnings.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="summary" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    {importResult.success > 0 && (
                      <Alert className="border-green-200 bg-green-50">
                        <AlertDescription className="text-green-800">
                          <span className="font-semibold">{isEn ? t.rowsProcessed(importResult.success) : `${importResult.success}件のデータが処理されました`}</span>
                          {importResult.created !== undefined && importResult.created > 0 && (
                            <span className="block mt-1">{isEn ? t.created(importResult.created) : `• ${importResult.created}件 新規作成`}</span>
                          )}
                          {importResult.updated !== undefined && importResult.updated > 0 && (
                            <span className="block mt-1">{isEn ? t.updated(importResult.updated) : `• ${importResult.updated}件 更新`}</span>
                          )}
                          {importResult.deleted !== undefined && importResult.deleted > 0 && (
                            <span className="block mt-1">{isEn ? t.deleted(importResult.deleted) : `• ${importResult.deleted}件 削除`}</span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                    {importResult.skipped !== undefined && importResult.skipped > 0 && (
                      <Alert className="border-blue-200 bg-blue-50">
                        <AlertDescription className="text-blue-800">{isEn ? t.skipped(importResult.skipped!) : <span className="font-semibold">{importResult.skipped}件</span>}</AlertDescription>
                      </Alert>
                    )}
                    {importResult.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertDescription>{isEn ? t.errorCount(importResult.errors.length) : <span className="font-semibold">{importResult.errors.length}件</span>}</AlertDescription>
                      </Alert>
                    )}
                    {importResult.warnings.length > 0 && (
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertDescription className="text-yellow-800">{isEn ? t.warningCount(importResult.warnings.length) : <span className="font-semibold">{importResult.warnings.length}件</span>}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="errors" className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    {importResult && (importResult as any).errorCsv && (
                      <a
                        href={(importResult as any).errorCsv as string}
                        download={(importResult as any).errorCsvFilename || "student_import_errors.csv"}
                        className="text-primary text-sm hover:underline"
                      >
                        {t.downloadErrorCsv}
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
                              {t.row} {error.row}
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
                            {warning.warnings && Array.isArray(warning.warnings) ? (
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
                {importResult.success > 0 && importResult.errors.length === 0 && (
                  <Button 
                    variant="default"
                    onClick={() => {
                      handleClose();
                      onImportComplete?.();
                    }}
                  >
                    {t.closeAndRefresh}
                  </Button>
                )}
                {importResult.errors.length > 0 && (
                  <Button variant="outline" onClick={handleClose}>
                    {t.close}
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
