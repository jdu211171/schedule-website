"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useClassSessions } from '@/components/match/hooks/useClassSessionQuery';
import { ClassSession } from '@/schemas/class-session.schema';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { ChevronUp, ChevronDown, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { EditStandaloneClassSessionForm } from './edit-standalone-class-session-form';
import { EditTemplateClassSessionForm } from './edit-template-class-session-form';
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
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { Booth } from '@prisma/client';

interface SortConfig {
  key: keyof ClassSession | 'teacherName' | 'studentName' | 'subjectName' | 'classTypeName' | 'dateOnly' | 'boothName';
  direction: 'asc' | 'desc';
}

interface FormConfig {
  type: 'standalone' | 'template' | null;
  component: React.ComponentType<any> | null;
  props: any;
}

interface BoothResponse {
  data: Booth[];
}

export default function AdminCalendarList() {
  const queryClient = useQueryClient();
  const { data: classSessionsResponse, isLoading, isError, error } = useClassSessions();
  const classSessions: ClassSession[] | undefined = classSessionsResponse?.data;
  const { data: boothsData } = useQuery<BoothResponse>({
    queryKey: ['booths'],
    queryFn: async () => await fetcher<BoothResponse>('/api/booth'),
    staleTime: Infinity,
  });
  const booths = boothsData?.data || [];

  const getBoothName = (boothId: string | null | undefined) => {
    if (!boothId) return '-';
    const booth = booths.find((b) => b.boothId === boothId);
    return booth?.name || '-';
  };

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'dateOnly',
    direction: 'asc',
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<ClassSession | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedClassSessions = useMemo(() => {
    if (!classSessions) return [];

    return [...classSessions].sort((a, b) => {
      if (!a || !b) return 0;

      const getSortValue = (session: ClassSession, key: SortConfig['key']) => {
        switch (key) {
          case 'teacherName': return session.teacher?.name || '';
          case 'studentName': return session.student?.name || '';
          case 'subjectName': return session.subject?.name || '';
          case 'classTypeName': return session.classType?.name || '';
          case 'dateOnly': return session.date ? new Date(session.date) : new Date(0);
          case 'boothName': return getBoothName(session.boothId);
          default: return session[key] as any;
        }
      };

      const valueA = getSortValue(a, sortConfig.key);
      const valueB = getSortValue(b, sortConfig.key);

      if (valueA < valueB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [classSessions, sortConfig, getBoothName]);

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '---';
    return format(new Date(date), 'dd.MM.yy');
  };

  const formatTime = (time: string) => {
    return time.split('T')[1].split('.')[0];
  };

  const handleEditClick = (session: ClassSession) => {
    setEditingSession(session);
    setIsEditDialogOpen(true);
  };

  const handleSessionUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['class-sessions'] });
  };

  const handleDeleteClick = (session: ClassSession) => {
    setSessionToDelete(session);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (sessionToDelete) {
      try {
        const response = await fetch(`/api/class-session?classId=${sessionToDelete.classId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': document.cookie,
          },
        });

        if (response.ok) {
          console.log(`Занятие с ID ${sessionToDelete.classId} успешно удалено.`);
          queryClient.invalidateQueries({ queryKey: ['class-sessions'] });
        } else {
          const errorData = await response.json();
          console.error(`Ошибка при удалении занятия с ID ${sessionToDelete.classId}:`, errorData);
          alert(`Ошибка при удалении занятия: ${errorData?.message || 'Не удалось удалить занятие.'}`);
        }
      } catch (error) {
        console.error(`Произошла ошибка при удалении занятия с ID ${sessionToDelete.classId}:`, error);
        alert('Произошла непредвиденная ошибка при удалении занятия.');
      } finally {
        setIsDeleteDialogOpen(false);
        setSessionToDelete(null);
      }
    }
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  const formConfig = useMemo<FormConfig>(() => {
    if (!isEditDialogOpen || !editingSession) {
      return { type: null, component: null, props: {} };
    }

    if (typeof editingSession.templateId === 'string') {
      return {
        type: 'template', // Изменено на 'template'
        component: EditTemplateClassSessionForm,
        props: {
          open: isEditDialogOpen,
          onOpenChange: setIsEditDialogOpen,
          session: editingSession,
          onSessionUpdated: handleSessionUpdated,
        },
      };
    } else {
      return {
        type: 'standalone', // Изменено на 'standalone'
        component: EditStandaloneClassSessionForm,
        props: {
          open: isEditDialogOpen,
          onOpenChange: setIsEditDialogOpen,
          session: editingSession,
          onSessionUpdated: handleSessionUpdated,
        },
      };
    }
  }, [isEditDialogOpen, editingSession, handleSessionUpdated]);

  if (isLoading) {
    return <div>Загрузка расписания...</div>;
  }

  if (isError) {
    return <div>Ошибка загрузки расписания: {error?.message || 'Не удалось загрузить расписание.'}</div>;
  }


  return (
    <div className="w-full flex flex-col space-y-4">
      <Card className="p-4 border-0 shadow-sm">
        <h2 className="font-semibold text-lg">Расписание занятий</h2>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="relative w-32">
                  <div className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between" onClick={() => handleSort('dateOnly')}>
                    <span>Дата</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={cn('h-4 w-4', sortConfig.key === 'dateOnly' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground')} />
                      <ChevronDown className={cn('h-4 w-4', sortConfig.key === 'dateOnly' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground')} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-32">
                  <div className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between" onClick={() => handleSort('startTime')}>
                    <span>Начало</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={cn('h-4 w-4', sortConfig.key === 'startTime' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground')} />
                      <ChevronDown className={cn('h-4 w-4', sortConfig.key === 'startTime' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground')} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-32">
                  <div className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between" onClick={() => handleSort('endTime')}>
                    <span>Конец</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={cn('h-4 w-4', sortConfig.key === 'endTime' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground')} />
                      <ChevronDown className={cn('h-4 w-4', sortConfig.key === 'endTime' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground')} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-40">
                  <div className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between" onClick={() => handleSort('teacherName')}>
                    <span>Преподаватель</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={cn('h-4 w-4', sortConfig.key === 'teacherName' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground')} />
                      <ChevronDown className={cn('h-4 w-4', sortConfig.key === 'teacherName' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground')} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-40">
                  <div className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between" onClick={() => handleSort('studentName')}>
                    <span>Студент</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={cn('h-4 w-4', sortConfig.key === 'studentName' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground')} />
                      <ChevronDown className={cn('h-4 w-4', sortConfig.key === 'studentName' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground')} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-32">
                  <div className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between" onClick={() => handleSort('subjectName')}>
                    <span>Предмет</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={cn('h-4 w-4', sortConfig.key === 'subjectName' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground')} />
                      <ChevronDown className={cn('h-4 w-4', sortConfig.key === 'subjectName' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground')} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-32">
                  <div className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between" onClick={() => handleSort('boothName')}>
                    <span>Будка</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={cn('h-4 w-4', sortConfig.key === 'boothName' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground')} />
                      <ChevronDown className={cn('h-4 w-4', sortConfig.key === 'boothName' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground')} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-32">
                  <div className="px-2 py-3">
                    <span>Шаблон ID</span>
                  </div>
                </TableHead>
                <TableHead className="relative w-32">
                  <div className="cursor-pointer px-2 py-3 hover:bg-muted/50 flex items-center justify-between" onClick={() => handleSort('classTypeName')}>
                    <span>Тип занятия</span>
                    <div className="flex flex-col -space-y-1">
                      <ChevronUp className={cn('h-4 w-4', sortConfig.key === 'classTypeName' && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-muted-foreground')} />
                      <ChevronDown className={cn('h-4 w-4', sortConfig.key === 'classTypeName' && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-muted-foreground')} />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="relative w-24">
                  <span>Действия</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center">Загрузка расписания...</TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center">Ошибка загрузки расписания: {error?.message || 'Не удалось загрузить расписание.'}</TableCell>
                </TableRow>
              ) : sortedClassSessions.length > 0 ? (
                sortedClassSessions.map((session) => (
                  <TableRow key={session.classId}>
                    <TableCell>{formatDate(session.date)}</TableCell>
                    <TableCell>{formatTime(session.startTime)}</TableCell>
                    <TableCell>{formatTime(session.endTime)}</TableCell>
                    <TableCell>{session.teacher?.name || '-'}</TableCell>
                    <TableCell>{session.student?.name || '-'}</TableCell>
                    <TableCell>{session.subject?.name || '-'}</TableCell>
                    <TableCell>{getBoothName(session.boothId)}</TableCell>
                    <TableCell>{session.templateId === null ? 'null' : session.templateId}</TableCell>
                    <TableCell>{session.classType?.name || '-'}</TableCell>
                    <TableCell className="flex justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(session)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(session)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={12} className="text-center">Нет данных о занятиях.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {formConfig.component && (
        <formConfig.component {...formConfig.props} />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить занятие
              {sessionToDelete && ` "${formatDate(sessionToDelete.date)} в ${formatTime(sessionToDelete.startTime)}"?`}
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSession}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
