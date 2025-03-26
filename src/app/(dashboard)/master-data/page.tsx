import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";

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
        <TabsList className="flex space-x-2">
          {tabItems.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabItems.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            <div className="mt-4">
              {/* Здесь будет таблица */}
              <p>Таблица для {tab.label}</p>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
