// src/app/dashboard/schedules/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import AdminCalendarDay from '@/components/admin-schedule/DayCalendar/admin-calendar-day';
// import AdminCalendarWeek from '@/components/admin-schedule/admin-calendar-week';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClassSessionTable } from '@/components/class-session/class-session-table';

// Storage key for tab persistence
const ACTIVE_TAB_KEY = "schedulepage_active_tab";

export default function ScheduleManagementPage() {
    // Initialize with a default value, will be updated after mount
    const [activeTab, setActiveTab] = useState("day");
    const [isInitialized, setIsInitialized] = useState(false);

    // On component mount, load the saved tab from localStorage
    useEffect(() => {
        const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
        if (savedTab) {
            setActiveTab(savedTab);
        }
        setIsInitialized(true);
    }, []);

    // Handle tab change and save to localStorage
    const handleTabChange = (value: string) => {
        setActiveTab(value);
        localStorage.setItem(ACTIVE_TAB_KEY, value);
    };

    // Prevent rendering with default value during SSR/hydration to avoid flicker
    if (!isInitialized) {
        return null; // Show nothing during initial render to prevent flicker
    }

    return (
        <div className="container mx-auto space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">総合授業スケジュール</h1>
            </div>

            <Tabs
                defaultValue={activeTab}
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full"
            >
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
                    <ClassSessionTable />
                </TabsContent>
            </Tabs>
        </div>
    );
}
