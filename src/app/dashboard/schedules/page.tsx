"use client";

import React, { useState } from 'react';
import AdminCalendarDay from '@/components/admin-schedule/admin-calendar-day';
import AdminCalendarWeek from '@/components/admin-schedule/admin-calendar-week';
import AdminCalendarList from '@/components/admin-schedule/admin-calendar-list';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ScheduleManagementPage() {
  const [activeMode, setActiveMode] = useState<'view' | 'create'>('view');

  return (
    <div className="container mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">総合授業スケジュール</h1>
        <div className="flex space-x-2">
          <Button 
            variant={activeMode === 'view' ? 'default' : 'outline'}
            onClick={() => setActiveMode('view')}
          >
            スケジュール閲覧
          </Button>
          <Button 
            variant={activeMode === 'create' ? 'default' : 'outline'}
            onClick={() => setActiveMode('create')}
          >
            授業マッチング
          </Button>
        </div>
      </div>

      <Tabs defaultValue="day" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="day">日次</TabsTrigger>
          <TabsTrigger value="week">週次</TabsTrigger>
          <TabsTrigger value="month">月次</TabsTrigger>
          <TabsTrigger value="list">リスト</TabsTrigger>
        </TabsList>
        <TabsContent value="day">
          <AdminCalendarDay mode={activeMode} />
        </TabsContent>
        <TabsContent value="week">
          {/* Заменяем заглушку на компонент AdminCalendarWeek */}
          <AdminCalendarWeek mode={activeMode} />
        </TabsContent>
        <TabsContent value="month">
          {/* Здесь будет месячное представление */}
          <p>月間表示は開発中です。</p>
        </TabsContent>
        <TabsContent value="list">
          <AdminCalendarList />
        </TabsContent>
      </Tabs>
    </div>
  );
}