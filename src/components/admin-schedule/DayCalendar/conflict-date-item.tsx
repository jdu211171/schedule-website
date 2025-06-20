import React from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { ConflictData, ConflictType } from './types/class-session';

interface ConflictDateItemProps {
  conflict: ConflictData;
}

const getConflictStyles = (type: ConflictType): string => {
  switch (type) {
    case 'STUDENT_UNAVAILABLE':
    case 'TEACHER_UNAVAILABLE':
      return 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300';
    case 'STUDENT_WRONG_TIME':
    case 'TEACHER_WRONG_TIME':
      return 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300';
    case 'VACATION':
      return 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300';
    case 'BOOTH_CONFLICT':
      return 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300';
    default:
      return 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-300';
  }
};

const getConflictTypeLabel = (type: ConflictType): string => {
  switch (type) {
    case 'STUDENT_UNAVAILABLE':
      return '生徒不在';
    case 'TEACHER_UNAVAILABLE':
      return '教師不在';
    case 'STUDENT_WRONG_TIME':
      return '生徒時間不一致';
    case 'TEACHER_WRONG_TIME':
      return '教師時間不一致';
    case 'VACATION':
      return '休暇期間';
    case 'BOOTH_CONFLICT':
      return '教室競合';
    default:
      return '競合';
  }
};

export const ConflictDateItem: React.FC<ConflictDateItemProps> = ({ conflict }) => {
  const formatDate = (dateStr: string, dayOfWeek: string): string => {
    const date = new Date(dateStr + 'T00:00:00.000Z');
    const dayOfWeekJa = format(date, 'EEEE', { locale: ja }).charAt(0);
    return `${format(date, 'yyyy年MM月dd日', { locale: ja })} (${dayOfWeekJa})`;
  };

  return (
    <div className={`p-3 rounded-md border ${getConflictStyles(conflict.type)}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="font-medium text-sm">
              {formatDate(conflict.date, conflict.dayOfWeek)}
            </div>
            <div className="text-xs px-2 py-1 rounded-full bg-background/50 border">
              {getConflictTypeLabel(conflict.type)}
            </div>
          </div>
          
          <div className="text-sm mb-2">
            {conflict.details}
          </div>
          
          {conflict.availableSlots.length > 0 && (
            <div className="text-xs">
              <div className="font-medium mb-1">利用可能時間:</div>
              <div className="flex flex-wrap gap-1">
                {conflict.availableSlots.map((slot, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 rounded bg-background/80 border text-xs"
                  >
                    {slot.startTime} - {slot.endTime}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-xs mt-2 opacity-75">
            参加者: {conflict.participant.name} ({conflict.participant.role === 'student' ? '生徒' : '教師'})
          </div>
        </div>
      </div>
    </div>
  );
};