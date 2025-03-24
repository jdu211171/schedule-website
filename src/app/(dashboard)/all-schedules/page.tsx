// app/all-schedules/page.tsx
"use client";

import React, { useState } from 'react';
import AdminCalendarDay from '@/components/calendar/AdminCalendarDay';
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
          {/* Здесь будет недельное представление */}
          <p>週間表示は開発中です。</p>
        </TabsContent>
        <TabsContent value="month">
          {/* Здесь будет месячное представление */}
          <p>月間表示は開発中です。</p>
        </TabsContent>
        <TabsContent value="list">
          {/* Здесь будет представление в виде списка */}
          <p>リスト表示は開発中です。</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}