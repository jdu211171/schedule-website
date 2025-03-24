'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>個人スケジュール</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-md border-dashed flex items-center justify-center h-[400px]">
            スケジュールがここに表示されます
          </div>
        </CardContent>
      </Card>
    </div>
  );
}