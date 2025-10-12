"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useArchiveQuery, Archive } from "@/hooks/useArchiveQuery";
import { Search, Calendar, Users, User, FileText } from "lucide-react";
import { ArchiveDetailDialog } from "./archive-detail-dialog";

export function ArchiveTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [filters, setFilters] = useState({
    teacherName: "",
    studentName: "",
    subjectName: "",
    branchName: "",
    dateFrom: "",
    dateTo: "",
  });
  const [selectedArchive, setSelectedArchive] = useState<Archive | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data, isLoading } = useArchiveQuery({
    page,
    limit,
    ...filters,
  });

  const archives = data?.data || [];
  const pagination = data?.pagination;

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  };

  const formatTime = (timeString: string) => {
    const time = new Date(timeString);
    return format(time, "HH:mm");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "yyyy年MM月dd日 (E)", { locale: ja });
  };

  const handleRowClick = (archive: Archive) => {
    setSelectedArchive(archive);
    setDetailDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>アーカイブ検索</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">講師名</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="講師名で検索"
                  value={filters.teacherName}
                  onChange={(e) => handleFilterChange("teacherName", e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">生徒名</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="生徒名で検索"
                  value={filters.studentName}
                  onChange={(e) => handleFilterChange("studentName", e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">科目名</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="科目名で検索"
                  value={filters.subjectName}
                  onChange={(e) => handleFilterChange("subjectName", e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">支店名</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="支店名で検索"
                  value={filters.branchName}
                  onChange={(e) => handleFilterChange("branchName", e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">開始日</label>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">終了日</label>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">表示件数:</span>
              <Select
                value={String(limit)}
                onValueChange={(value) => {
                  setLimit(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {pagination && (
              <span className="text-sm text-muted-foreground">
                全 {pagination.total} 件
              </span>
            )}
          </div>

          <ScrollArea className="w-full">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日付</TableHead>
                    <TableHead>時間</TableHead>
                    <TableHead>講師</TableHead>
                    <TableHead>生徒</TableHead>
                    <TableHead>科目</TableHead>
                    <TableHead>ブース</TableHead>
                    <TableHead>支店</TableHead>
                    <TableHead>授業タイプ</TableHead>
                    <TableHead>種別</TableHead>
                    <TableHead>アーカイブ日時</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 10 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : archives.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            アーカイブが見つかりませんでした
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    archives.map((archive) => (
                      <TableRow
                        key={archive.archiveId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(archive)}
                      >
                        <TableCell>{formatDate(archive.date)}</TableCell>
                        <TableCell>
                          {formatTime(archive.startTime)} - {formatTime(archive.endTime)}
                        </TableCell>
                        <TableCell>{archive.teacherName || "-"}</TableCell>
                        <TableCell>{archive.studentName || "-"}</TableCell>
                        <TableCell>{archive.subjectName || "-"}</TableCell>
                        <TableCell>{archive.boothName || "-"}</TableCell>
                        <TableCell>{archive.branchName || "-"}</TableCell>
                        <TableCell>{archive.classTypeName || "-"}</TableCell>
                        <TableCell>
                          {archive.enrolledStudents ? (
                            <Badge variant="secondary" className="gap-1">
                              <Users className="h-3 w-3" />
                              グループ
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <User className="h-3 w-3" />
                              個別
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(archive.archivedAt), "yyyy/MM/dd HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {pagination && pagination.pages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage(Math.max(1, page - 1))}
                      className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {/* Show page numbers */}
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pageNumber = i + 1;
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          onClick={() => setPage(pageNumber)}
                          isActive={pageNumber === page}
                          className="cursor-pointer"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  {pagination.pages > 5 && (
                    <PaginationItem>
                      <span className="px-3">...</span>
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                      className={page === pagination.pages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <ArchiveDetailDialog
        archive={selectedArchive}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </>
  );
}