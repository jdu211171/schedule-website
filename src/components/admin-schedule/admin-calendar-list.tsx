'use client';
import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';
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
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

import {
  ClassSessionProcessed,
  useClassSessions,
} from '@/components/match/hooks/useClassSessions';
import { EditClassSessionForm } from '@/components/admin-schedule/edit-class-session-form';
import { format } from 'date-fns';


type ClassSession = ClassSessionProcessed & {
  templateId: string | null;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  boothId?: string;
  classTypeId?: string;
  notes?: string;
};

export default function AdminCalendarList() {
  const { data: templates, isLoading, error, setTemplates } = useClassSessions();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);

  const [sortConfig, setSortConfig] = useState<{
    key: keyof ClassSession;
    direction: 'asc' | 'desc';
  }>( {
    key: 'day',
    direction: 'asc',
  });

  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [isDeleteDialogOpenForDelete, setIsDeleteDialogOpenForDelete] = useState(false);

  const handleSort = (key: keyof ClassSession) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
  };

  const sortedTemplates = React.useMemo(() => {
    if (!Array.isArray(templates) || templates === undefined || templates.length === 0) return [];

    return [...(templates as ClassSession[])].sort((a, b) => {
      if (!a || !b) return 0;

      switch (sortConfig.key) {
        case 'day':
          const dayOrder: Record<string, number> = {
            'monday': 0,
            'tuesday': 1,
            'wednesday': 2,
            'thursday': 3,
            'friday': 4,
            'saturday': 5,
            'sunday': 6,
          };
          const dayA = a.day && dayOrder[a.day.toLowerCase()] !== undefined ? dayOrder[a.day.toLowerCase()] : 999;
          const dayB = b.day && dayOrder[b.day.toLowerCase()] !== undefined ? dayOrder[b.day.toLowerCase()] : 999;
          return sortConfig.direction === 'asc'
            ? dayA - dayB
            : dayB - dayA;
        case 'startTime':
          return sortConfig.direction === 'asc'
            ? a.startTime.localeCompare(b.startTime)
            : b.startTime.localeCompare(a.startTime);
        case 'endTime':
          return sortConfig.direction === 'asc'
            ? a.endTime.localeCompare(b.endTime)
            : b.endTime.localeCompare(a.endTime);
        case 'subject':
          return sortConfig.direction === 'asc'
            ? a.subject.localeCompare(b.subject)
            : b.subject.localeCompare(a.subject);
        case 'teacher':
          return sortConfig.direction === 'asc'
            ? a.teacher.localeCompare(b.teacher)
            : b.teacher.localeCompare(a.teacher);
        case 'student':
          return sortConfig.direction === 'asc'
            ? a.student.localeCompare(b.student)
            : b.student.localeCompare(a.student);
        case 'date':
          return sortConfig.direction === 'asc'
            ? a.date.getTime() - b.date.getTime()
            : b.date.getTime() - a.date.getTime();
        case 'status':
          return sortConfig.direction === 'asc'
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status);
        default:
          return 0;
      }
    });
  }, [templates, sortConfig]);

  const handleEditClick = (session: ClassSession) => {
    setEditingSession(session);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (templateId: string) => {
    console.log('Вызвана функция handleDeleteClick с ID:', templateId);
    setDeleteTemplateId(templateId);
    setIsDeleteDialogOpenForDelete(true);
  };
  useEffect(() => {
    console.log('Data from useClassSessions:', templates);
  }, [templates]);
  const confirmDelete = async () => {
    if (deleteTemplateId) {
      try {
        const response = await fetch(
          `/api/class-session?classId=${deleteTemplateId}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              // 'Cookie': document.cookie,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Ошибка при удалении сессии класса:', errorData);
          // TODO: Показать пользователю сообщение об ошибке
          return;
        }

        console.log(`Сессия класса с ID ${deleteTemplateId} успешно удалена`);
        // TODO: Обновить состояние templates после успешного удаления
        const updatedTemplates = (templates as ClassSession[]).filter(
          (template) => template.classId !== deleteTemplateId
        );
        setTemplates(updatedTemplates);
      } catch (error) {
        console.error('Ошибка при отправке запроса на удаление:', error);
        // TODO: Показать пользователю сообщение об ошибке
      } finally {
        setIsDeleteDialogOpenForDelete(false);
        setDeleteTemplateId(null);
      }
    }
  };
  const handleSessionUpdated = async () => {
    // После успешного обновления данных, заново запросите список сессий
    const response = await fetch('/api/class-session');
    if (response.ok) {
      const result: { data: ClassSessionProcessed[] } = await response.json();
      setTemplates(result.data as ClassSession[]);
    } else {
      console.error('Ошибка при обновлении списка сессий');
      // TODO: Обработать ошибку
    }
  };
  const dayOfWeekMap: Record<string, string> = {
    'monday': '月曜日',
    'tuesday': '火曜日',
    'wednesday': '水曜日',
    'thursday': '木曜日',
    'friday': '金曜日',
    'saturday': '土曜日',
    'sunday': '日曜日',
  };

  const displayDayOfWeek = (day: string | null | undefined) => {
    if (!day) return '---';
    return dayOfWeekMap[day?.toLowerCase()] || day;
  };

  const displayDate = (date: Date | null | undefined) => {
    if (!date) return '---';
    return format(date, 'dd.MM.yy');
  };

  const totalItems = templates?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const displayedTemplates = React.useMemo(() => {
    if (!templates) return [];
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sortedTemplates.slice(start, end);
  }, [sortedTemplates, page, pageSize, templates]);
  return (
    <div className="w-full flex flex-col space-y-4">
      <Card className="p-4 border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="font-semibold text-lg">授業テンプレート一覧</h2>
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
                <TableHead className="relative w-32">
                  <div
                    className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between"
                    onClick={() => handleSort('teacher')}
                  >
                    <span>教師</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={`h-4 w-4 ${sortConfig.key === 'teacher' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                      <ChevronDown className={`h-4 w-4 ${sortConfig.key === 'teacher' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-40">
                  <div
                    className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between"
                    onClick={() => handleSort('student')}
                  >
                    <span>生徒</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={`h-4 w-4 ${sortConfig.key === 'student' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                      <ChevronDown className={`h-4 w-4 ${sortConfig.key === 'student' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-32">
                  <div
                    className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between"
                    onClick={() => handleSort('subject')}
                  >
                    <span>科目</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={`h-4 w-4 ${sortConfig.key === 'subject' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                      <ChevronDown className={`h-4 w-4 ${sortConfig.key === 'subject' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-32">
                  <div
                    className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between"
                    onClick={() => handleSort('startTime')}
                  >
                    <span>開始</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={`h-4 w-4 ${sortConfig.key === 'startTime' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                      <ChevronDown className={`h-4 w-4 ${sortConfig.key === 'startTime' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-32">
                  <div
                    className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between"
                    onClick={() => handleSort('endTime')}
                  >
                    <span>終了</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={`h-4 w-4 ${sortConfig.key === 'endTime' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                      <ChevronDown className={`h-4 w-4 ${sortConfig.key === 'endTime' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-24">
                  <div
                    className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between"
                    onClick={() => handleSort('day')}
                  >
                    <span>曜日</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={`h-4 w-4 ${sortConfig.key === 'day' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                      <ChevronDown className={`h-4 w-4 ${sortConfig.key === 'day' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-16">
                  <div
                    className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between"
                    onClick={() => handleSort('date')}
                  >
                    <span>日付</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={`h-4 w-4 ${sortConfig.key === 'date' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                      <ChevronDown className={`h-4 w-4 ${sortConfig.key === 'date' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-20">
                  <div
                    className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between"
                    onClick={() => handleSort('status')}
                  >
                    <span>ステータス</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={`h-4 w-4 ${sortConfig.key === 'status' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                      <ChevronDown className={`h-4 w-4 ${sortConfig.key === 'status' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground'}`} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-32">
                  <div className="px-2 py-3">
                    <span>タイプ</span>
                  </div>
                </TableHead>
                <TableHead className="relative w-16">編集</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">読み込み中...</TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">エラーが発生しました。</TableCell>
                </TableRow>
              ) : displayedTemplates.length > 0 ? (
                displayedTemplates.map((template) => (
                  <TableRow key={template.teacher + template.student + template.date + template.startTime}>
                    <TableCell>{template.teacher}</TableCell>
                    <TableCell>{template.student}</TableCell>
                    <TableCell>{template.subject}</TableCell>
                    <TableCell>{template.startTime}</TableCell>
                    <TableCell>{template.endTime}</TableCell>
                    <TableCell>{displayDayOfWeek(template.day)}</TableCell>
                    <TableCell>{displayDate(template.date)}</TableCell>
                    <TableCell>{template.status}</TableCell>
                    <TableCell>{template.classTypeName}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditClick(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteClick(template.classId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">データがありません。</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink
              className={cn({ 'opacity-50 cursor-not-allowed': page <= 1 })}
              onClick={() => {
                if (page > 1) {
                  setPage(1);
                }
              }}
            >
              {'<<'}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              className={cn({ 'opacity-50 cursor-not-allowed': page <= 1 })}
              onClick={() => {
                if (page > 1) {
                  setPage(page - 1);
                }
              }}
            >
              {'<'}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink isActive={true}>
              {page}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              className={cn({ 'opacity-50 cursor-not-allowed': page >= totalPages })}
              onClick={() => {
                if (page < totalPages) {
                  setPage(page + 1);
                }
              }}
            >
              {'>'}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              className={cn({ 'opacity-50 cursor-not-allowed': page >= totalPages })}
              onClick={() => {
                if (page < totalPages) {
                  setPage(totalPages);
                }
              }}
            >
              {'>>'}
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      {editingSession && (
        <EditClassSessionForm
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          session={editingSession}
          onSessionUpdated={handleSessionUpdated}
        />
      )}
      <AlertDialog open={isDeleteDialogOpenForDelete} onOpenChange={setIsDeleteDialogOpenForDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>テンプレートを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              このテンプレートを削除する操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
