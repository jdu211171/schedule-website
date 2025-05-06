
'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  useRegularClassTemplates,
} from '@/hooks/useRegularClassTemplateQuery';
import {
  useRegularClassTemplateDelete,
} from '@/hooks/useRegularClassTemplateMutation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Search, Edit, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

// Определение типа для шаблона с отношениями
type TemplateWithRelations = {
  templateId: string;
  dayOfWeek: string;
  startTime: Date;
  endTime: Date;
  notes: string | null;
  startDate: Date | null;
  endDate: Date | null;
  booth: { name: string } | null;
  teacher: { name: string } | null;
  subject: { name: string } | null;
  templateStudentAssignments: {
    student: { name: string } | null;
  }[];
};

type AdminCalendarListProps = {
  mode?: 'view' | 'create';
};

export default function AdminCalendarList({ mode = 'view' }: AdminCalendarListProps) {
  const [safeTemplates, setSafeTemplates] = useState<TemplateWithRelations[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Состояние для сортировки
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'dayOfWeek',
    direction: 'asc',
  });

  // Состояние для удаления
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Получение данных с дополнительной безопасностью
  const { data, isLoading, error } = useRegularClassTemplates({
    page,
    // pageSize
  }) as any;

  // Безопасно обновляем локальное состояние когда данные меняются
  useEffect(() => {
    if (data) {
      try {
        // Проверяем, является ли data массивом
        const templatesArray = Array.isArray(data) ? data : [];
        setSafeTemplates(templatesArray);
      } catch (e) {
        console.error('Error processing templates data:', e);
        setSafeTemplates([]);
      }
    } else {
      setSafeTemplates([]);
    }
  }, [data]);

  // Мутации для удаления
  const deleteTemplateMutation = useRegularClassTemplateDelete();

  // Обработчик сортировки
  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
  };

  // Сортировка текущих данных с безопасной проверкой
  const sortedTemplates = React.useMemo(() => {
    // Всегда проверяем, что у нас есть массив для работы
    if (!Array.isArray(safeTemplates) || safeTemplates.length === 0) return [];

    return [...safeTemplates].sort((a, b) => {
      if (!a || !b) return 0;

      switch (sortConfig.key) {
        case 'dayOfWeek':
          const dayOrder: Record<string, number> = {
            'monday': 0,
            'tuesday': 1,
            'wednesday': 2,
            'thursday': 3,
            'friday': 4,
            'saturday': 5,
            'sunday': 6
          };
          const dayA = a.dayOfWeek && dayOrder[a.dayOfWeek.toLowerCase()] !== undefined ? dayOrder[a.dayOfWeek.toLowerCase()] : 999;
          const dayB = b.dayOfWeek && dayOrder[b.dayOfWeek.toLowerCase()] !== undefined ? dayOrder[b.dayOfWeek.toLowerCase()] : 999;
          return sortConfig.direction === 'asc'
            ? dayA - dayB
            : dayB - dayA;

        case 'startTime':
          const startTimeA = a.startTime instanceof Date ? a.startTime.getTime() : 0;
          const startTimeB = b.startTime instanceof Date ? b.startTime.getTime() : 0;
          return sortConfig.direction === 'asc'
            ? startTimeA - startTimeB
            : startTimeB - startTimeA;

        case 'endTime':
          const endTimeA = a.endTime instanceof Date ? a.endTime.getTime() : 0;
          const endTimeB = b.endTime instanceof Date ? b.endTime.getTime() : 0;
          return sortConfig.direction === 'asc'
            ? endTimeA - endTimeB
            : endTimeB - endTimeA;

        case 'boothId':
          const boothNameA = a.booth?.name || '';
          const boothNameB = b.booth?.name || '';
          return sortConfig.direction === 'asc'
            ? boothNameA.localeCompare(boothNameB)
            : boothNameB.localeCompare(boothNameA);

        default:
          return 0;
      }
    });
  }, [safeTemplates, sortConfig]);

  // Формат времени с безопасной проверкой
  const formatTime = (date: Date | null | undefined) => {
    if (!date || !(date instanceof Date)) return '--:--';
    try {
      return format(date, 'HH:mm', { locale: ja });
    } catch (e) {
      console.error('Error formatting time:', e);
      return '--:--';
    }
  };

  // Обработчик удаления
  const handleDeleteClick = (templateId: string) => {
    setDeleteTemplateId(templateId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteTemplateId) {
      try {
        await deleteTemplateMutation.mutateAsync(deleteTemplateId);
      } catch (error) {
        console.error('Error deleting template:', error);
      } finally {
        setIsDeleteDialogOpen(false);
        setDeleteTemplateId(null);
      }
    }
  };

  // Перевод дней недели
  const dayOfWeekMap: Record<string, string> = {
    'monday': '月曜日',
    'tuesday': '火曜日',
    'wednesday': '水曜日',
    'thursday': '木曜日',
    'friday': '金曜日',
    'saturday': '土曜日',
    'sunday': '日曜日',
  };

  // Отображение дня недели с безопасной проверкой
  const displayDayOfWeek = (day: string | null | undefined) => {
    if (!day) return '---';
    return dayOfWeekMap[day.toLowerCase()] || day;
  };

  // Расчет страниц
  const totalItems = Array.isArray(safeTemplates) ? safeTemplates.length : 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // Состояние загрузки и ошибки
  if (isLoading) {
    return <div className="text-center py-8">データを読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        エラーが発生しました: {error.message || 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-4">
      <Card className="p-4 border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="font-semibold text-lg">
            授業テンプレート一覧
          </h2>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm whitespace-nowrap">表示件数:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="w-16 h-8">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="relative w-24">
                  <div
                    className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between"
                    onClick={() => handleSort('dayOfWeek')}
                  >
                    <span>曜日</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp
                        className={`h-4 w-4 ${
                          sortConfig.key === 'dayOfWeek' && sortConfig.direction === 'asc'
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      />
                      <ChevronDown
                        className={`h-4 w-4 ${
                          sortConfig.key === 'dayOfWeek' && sortConfig.direction === 'desc'
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative">
                  <div className="flex items-center">
                    <div
                      className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between w-16"
                      onClick={() => handleSort('startTime')}
                    >
                      <span>開始</span>
                      <div className="flex flex-col -space-y-1">
                        <ChevronUp
                          className={`h-4 w-4 ${
                            sortConfig.key === 'startTime' && sortConfig.direction === 'asc'
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        />
                        <ChevronDown
                          className={`h-4 w-4 ${
                            sortConfig.key === 'startTime' && sortConfig.direction === 'desc'
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                    </div>
                    <span className="mx-1">-</span>
                    <div
                      className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between w-16"
                      onClick={() => handleSort('endTime')}
                    >
                      <span>終了</span>
                      <div className="flex flex-col -space-y-1">
                        <ChevronUp
                          className={`h-4 w-4 ${
                            sortConfig.key === 'endTime' && sortConfig.direction === 'asc'
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        />
                        <ChevronDown
                          className={`h-4 w-4 ${
                            sortConfig.key === 'endTime' && sortConfig.direction === 'desc'
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative">
                  <div
                    className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between"
                    onClick={() => handleSort('boothId')}
                  >
                    <span>教室</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp
                        className={`h-4 w-4 ${
                          sortConfig.key === 'boothId' && sortConfig.direction === 'asc'
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      />
                      <ChevronDown
                        className={`h-4 w-4 ${
                          sortConfig.key === 'boothId' && sortConfig.direction === 'desc'
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative">
                  <div className="px-2 py-3">講師</div>
                </TableHead>
                <TableHead className="relative">
                  <div className="px-2 py-3">科目</div>
                </TableHead>
                <TableHead>
                  <div className="px-2 py-3">生徒</div>
                </TableHead>
                <TableHead>
                  <div className="px-2 py-3 w-32 truncate">メモ</div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="px-2 py-3">操作</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(sortedTemplates) && sortedTemplates.length > 0 ? (
                sortedTemplates.map((template: TemplateWithRelations) => (
                  <TableRow key={template.templateId}>
                    <TableCell>{displayDayOfWeek(template.dayOfWeek)}</TableCell>
                    <TableCell>
                      <div className="flex items-center w-32">
                        <span className="w-12 text-center">{formatTime(template.startTime)}</span>
                        <span className="mx-1">-</span>
                        <span className="w-12 text-center">{formatTime(template.endTime)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.booth?.name || '---'}
                    </TableCell>
                    <TableCell>
                      {template.teacher?.name || '---'}
                    </TableCell>
                    <TableCell>
                      {template.subject?.name || '---'}
                    </TableCell>
                    <TableCell>
                      {Array.isArray(template.templateStudentAssignments)
                        ? template.templateStudentAssignments
                        .map(assignment => assignment?.student?.name)
                        .filter(Boolean)
                        .join(', ') || '---'
                        : '---'}
                    </TableCell>
                    <TableCell className="w-32 max-w-[8rem] truncate">
                      {template.notes || '---'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDeleteClick(template.templateId)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    テンプレートが見つかりません
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageToShow: number;
              if (totalPages <= 5) {
                pageToShow = i + 1;
              } else if (page <= 3) {
                pageToShow = i + 1;
              } else if (page >= totalPages - 2) {
                pageToShow = totalPages - 4 + i;
              } else {
                pageToShow = page - 2 + i;
              }

              return (
                <PaginationItem key={pageToShow}>
                  <PaginationLink
                    onClick={() => setPage(pageToShow)}
                    isActive={page === pageToShow}
                  >
                    {pageToShow}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>テンプレートを削除</AlertDialogTitle>
            <AlertDialogDescription>
              本当にこのテンプレートを削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
