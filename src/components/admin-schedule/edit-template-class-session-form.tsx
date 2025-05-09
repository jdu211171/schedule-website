
// EditTemplateClassSessionForm.tsx
import React, { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateTemplateClassSessionSchema } from '@/schemas/class-session.schema';
import { useClassSessionUpdate } from '@/components/match/hooks/useClassSessionMutation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { Booth } from '@prisma/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FormData = z.infer<typeof UpdateTemplateClassSessionSchema>;

interface EditTemplateClassSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: FormData & { classId: string; boothId: string | null } | null;
  onSessionUpdated: () => void;
}

interface BoothResponse {
  data: Booth[];
}

export const EditTemplateClassSessionForm: React.FC<EditTemplateClassSessionFormProps> = ({
                                                                                            open,
                                                                                            onOpenChange,
                                                                                            session,
                                                                                            onSessionUpdated,
                                                                                          }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Убедимся, что classId не undefined
  const classId = session?.classId || '';

  // Исправленный вызов хука с явным указанием типа
  const { mutateAsync: updateClassSessionMutateAsync, isSuccess, isError, error } =
    useClassSessionUpdate<true>(classId, true);

  const { data: boothsData, isLoading: isBoothsLoading, isError: isBoothsError } = useQuery<BoothResponse>({
    queryKey: ['booths'],
    queryFn: async () => await fetcher<BoothResponse>('/api/booth'),
    staleTime: Infinity,
  });
  const booths = boothsData?.data || [];

  const defaultBoothId = session?.boothId || '';

  const form = useForm<FormData>({
    resolver: zodResolver(UpdateTemplateClassSessionSchema),
    defaultValues: {
      classId: session?.classId || '',
      startTime: session?.startTime?.split('T')[1]?.substring(0, 8) || '',
      endTime: session?.endTime?.split('T')[1]?.substring(0, 8) || '',
      boothId: defaultBoothId,
      notes: session?.notes || '',
    },
  });

  const { register, setValue, watch, getValues } = form;
  const selectedBoothId = watch('boothId');

  useEffect(() => {
    if (isSuccess) {
      setSuccessMsg("Занятие успешно обновлено");
      setTimeout(() => {
        onSessionUpdated();
        onOpenChange(false);
      }, 1000);
    }
  }, [isSuccess, onSessionUpdated, onOpenChange]);

  // Обработчик сохранения
  const handleSaveClick = async () => {
    if (!session?.classId) {
      setApiError('Ошибка: Отсутствует идентификатор занятия');
      return;
    }

    try {
      setIsSubmitting(true);
      setApiError(null);
      setSuccessMsg(null);

      const formData = getValues();

      // Консоль для отладки
      console.log('Отправляемые данные:', {
        classId: session.classId,
        startTime: formData.startTime,
        endTime: formData.endTime,
        boothId: formData.boothId,
        notes: formData.notes
      });

      // Явно указываем classId в отправляемых данных
      await updateClassSessionMutateAsync({
        classId: session.classId,
        startTime: formData.startTime,
        endTime: formData.endTime,
        boothId: formData.boothId,
        notes: formData.notes
      });
    } catch (err: any) {
      console.error('Ошибка при обновлении:', err);
      let errorMessage = 'Ошибка при обновлении занятия';

      if (err?.message) {
        errorMessage += `: ${err.message}`;
      }

      setApiError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Редактировать занятие (шаблон)</AlertDialogTitle>
          <AlertDialogDescription>
            Измените время, будку или примечания и нажмите "Сохранить".
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="startTime">Время начала</Label>
            <Input id="startTime" type="time" {...register('startTime')} />
            {form.formState.errors.startTime && (
              <p className="text-sm text-red-500">{String(form.formState.errors.startTime.message)}</p>
            )}
          </div>

          <div>
            <Label htmlFor="endTime">Время окончания</Label>
            <Input id="endTime" type="time" {...register('endTime')} />
            {form.formState.errors.endTime && (
              <p className="text-sm text-red-500">{String(form.formState.errors.endTime.message)}</p>
            )}
          </div>

          <div>
            <Label htmlFor="boothId">Будка</Label>
            <Select onValueChange={(value) => setValue('boothId', value)} defaultValue={defaultBoothId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите будку" />
              </SelectTrigger>
              <SelectContent>
                {isBoothsLoading ? (
                  <SelectItem disabled value="loading">Загрузка будок...</SelectItem>
                ) : isBoothsError ? (
                  <SelectItem disabled value="error">Ошибка загрузки будок</SelectItem>
                ) : (
                  booths.map((booth) => (
                    <SelectItem key={booth.boothId} value={booth.boothId}>
                      {booth.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.boothId && (
              <p className="text-sm text-red-500">{String(form.formState.errors.boothId.message)}</p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Примечания</Label>
            <Input id="notes" {...register('notes')} />
            {form.formState.errors.notes && (
              <p className="text-sm text-red-500">{String(form.formState.errors.notes.message)}</p>
            )}
          </div>

          {/* Сообщения об успехе */}
          {successMsg && (
            <div className="p-3 rounded bg-green-50 border border-green-200 text-green-600 text-sm">
              {successMsg}
            </div>
          )}

          {/* Ошибки API */}
          {apiError && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
              {apiError}
            </div>
          )}

          {isError && error && (
            <p className="text-sm text-red-500">
              {typeof error === 'object' && 'message' in error ? String(error.message) : 'Произошла ошибка'}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Отмена</AlertDialogCancel>
            <Button
              onClick={handleSaveClick}
              disabled={isSubmitting || isBoothsLoading}
              type="button"
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
