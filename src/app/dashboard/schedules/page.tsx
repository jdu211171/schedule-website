// src/app/dashboard/schedules/page.tsx
"use client";

import React from 'react';
import AdminCalendarDay from '@/components/admin-schedule/DayCalendar/admin-calendar-day';
// import AdminCalendarWeek from '@/components/admin-schedule/admin-calendar-week';
import AdminCalendarList  from '@/components/admin-schedule/AdminCalendar/admin-calendar-list'; // <--- CHANGED HERE
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ScheduleManagementPage() {
    return (
        <div className="container mx-auto space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">総合授業スケジュール</h1>
            </div>

            <Tabs defaultValue="day" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="day">日次</TabsTrigger>
                    <TabsTrigger value="week">週次</TabsTrigger>
                    <TabsTrigger value="list">リスト</TabsTrigger>
                </TabsList>
                <TabsContent value="day">
                    <AdminCalendarDay />
                </TabsContent>
                <TabsContent value="week">
                    {/*<AdminCalendarWeek />*/}
                </TabsContent>
                <TabsContent value="list">
                    <AdminCalendarList />
                </TabsContent>
            </Tabs>
        </div>
    );
}
