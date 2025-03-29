"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MasterDataTable } from "./components/master-data-table";
import { tableData } from "./data"; // Импортируем все данные для таблиц

// Таблица табов
const tabItems = [
  { key: "studentTypes", label: "学生タイプ一覧" },
  { key: "subjectTypes", label: "科目タイプ一覧" },
  { key: "grades", label: "学年一覧" },
  { key: "lessonTypes", label: "授業種別一覧" },
  { key: "evaluations", label: "評価一覧" },
  { key: "timeSlots", label: "時間枠一覧" },
  { key: "booths", label: "ブース一覧" },
  { key: "subjects", label: "科目一覧" },
  { key: "courses", label: "講座一覧" },
];

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState(tabItems[0].key);

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Таб-лист */}
        <TabsList className="flex space-x-2 overflow-x-auto">
          {tabItems.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Контент табов */}
        {tabItems.map((tab) => {
          const table = tableData[tab.key]; // Получаем данные для текущего таба
          if (!table) return null; // Если данных нет, не рендерим

          return (
            <TabsContent key={tab.key} value={tab.key}>
              <MasterDataTable columns={table.columns} data={table.data} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
