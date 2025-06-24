"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Send, CheckCircle, XCircle, MessageSquare, Users, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStudents, type Student } from "@/hooks/useStudentQuery";
import { useTeachers, type Teacher } from "@/hooks/useTeacherQuery";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LineTestPage() {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"custom" | "class-reminder">("custom");
  const [reminderType, setReminderType] = useState<"24h" | "30m">("24h");
  const [subjectName, setSubjectName] = useState("数学");
  const [classTime, setClassTime] = useState("14:00");
  const [classDate, setClassDate] = useState(new Date().toISOString().split('T')[0]);
  const [userType, setUserType] = useState<"all" | "students" | "teachers">("all");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  // Fetch students and teachers
  const { data: studentsData } = useStudents({ limit: 100 });
  const { data: teachersData } = useTeachers({ limit: 100 });

  // Filter users with LINE IDs
  const studentsWithLine = studentsData?.data.filter(s => s.lineId) || [];
  const teachersWithLine = teachersData?.data.filter(t => t.lineId) || [];

  // Get users based on selected type
  const availableUsers: (Student | Teacher)[] = userType === "students" 
    ? studentsWithLine
    : userType === "teachers"
    ? teachersWithLine
    : [...studentsWithLine, ...teachersWithLine];

  // Build the message based on type
  useEffect(() => {
    if (messageType === "class-reminder") {
      const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        return `${hours}:${minutes}`;
      };

      if (reminderType === "24h") {
        setMessage(
          `📚 明日の授業のお知らせ\n\n` +
          `科目: ${subjectName}\n` +
          `日付: ${classDate}\n` +
          `時間: ${formatTime(classTime)}\n\n` +
          `よろしくお願いします！`
        );
      } else {
        setMessage(
          `⏰ まもなく授業が始まります！\n\n` +
          `科目: ${subjectName}\n` +
          `時間: ${formatTime(classTime)} (30分後)\n\n` +
          `準備をお願いします。`
        );
      }
    }
  }, [messageType, reminderType, subjectName, classTime, classDate]);

  const handleUserToggle = (lineId: string) => {
    setSelectedUsers(prev => 
      prev.includes(lineId) 
        ? prev.filter(id => id !== lineId)
        : [...prev, lineId]
    );
  };

  const handleSelectAll = () => {
    const allLineIds = availableUsers
      .map(user => user.lineId)
      .filter((id): id is string => id !== null);
    setSelectedUsers(allLineIds);
  };

  const handleDeselectAll = () => {
    setSelectedUsers([]);
  };

  const sendMessage = async () => {
    if (selectedUsers.length === 0) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "送信先を選択してください。",
      });
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      // Get selected branch from localStorage
      const selectedBranchId = localStorage.getItem("selectedBranchId") || "";
      
      const response = await fetch('/api/line/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Selected-Branch': selectedBranchId,
        },
        body: JSON.stringify({
          lineIds: selectedUsers,
          message,
          testType: selectedUsers.length > 1 ? 'multicast' : 'individual'
        }),
      });

      const data = await response.json();
      setResults(data);

      if (data.success) {
        toast({
          title: "送信成功",
          description: `${data.summary.successful}件のメッセージを送信しました。`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "送信エラー",
          description: `${data.summary.failed}件のメッセージ送信に失敗しました。`,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "メッセージの送信に失敗しました。",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            LINE通知送信
          </CardTitle>
          <CardDescription>
            LINE連携済みのユーザーにメッセージを送信します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Type Selection */}
          <div className="space-y-3">
            <Label>送信対象</Label>
            <RadioGroup value={userType} onValueChange={(value: any) => setUserType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <label htmlFor="all" className="text-sm font-medium cursor-pointer">
                  全員 ({studentsWithLine.length + teachersWithLine.length}名)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="students" id="students" />
                <label htmlFor="students" className="text-sm font-medium cursor-pointer">
                  生徒のみ ({studentsWithLine.length}名)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="teachers" id="teachers" />
                <label htmlFor="teachers" className="text-sm font-medium cursor-pointer">
                  講師のみ ({teachersWithLine.length}名)
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* User Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>ユーザー選択 ({selectedUsers.length}名選択中)</Label>
              <div className="space-x-2">
                <Button size="sm" variant="outline" onClick={handleSelectAll}>
                  全選択
                </Button>
                <Button size="sm" variant="outline" onClick={handleDeselectAll}>
                  全解除
                </Button>
              </div>
            </div>
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
              {availableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  LINE連携済みのユーザーがいません。
                </p>
              ) : (
                availableUsers.map((user) => {
                  const lineId = user.lineId;
                  if (!lineId) return null;
                  
                  const name = user.name;
                  const isStudent = 'studentId' in user;
                  
                  return (
                    <div key={lineId} className="flex items-center space-x-2">
                      <Checkbox
                        id={lineId}
                        checked={selectedUsers.includes(lineId)}
                        onCheckedChange={() => handleUserToggle(lineId)}
                      />
                      <label 
                        htmlFor={lineId} 
                        className="text-sm font-medium cursor-pointer flex items-center gap-2 flex-1"
                      >
                        {isStudent ? (
                          <User className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Users className="h-4 w-4 text-green-500" />
                        )}
                        {name}
                        <span className="text-xs text-muted-foreground">
                          ({isStudent ? '生徒' : '講師'})
                        </span>
                      </label>
                    </div>
                  );
                }).filter(Boolean)
              )}
            </div>
          </div>

          {/* Message Type Selection */}
          <div className="space-y-3">
            <Label>メッセージタイプ</Label>
            <RadioGroup value={messageType} onValueChange={(value: any) => setMessageType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <label htmlFor="custom" className="text-sm font-medium cursor-pointer">
                  カスタムメッセージ
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="class-reminder" id="class-reminder" />
                <label htmlFor="class-reminder" className="text-sm font-medium cursor-pointer">
                  授業リマインダー
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Class Reminder Options */}
          {messageType === "class-reminder" && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>リマインダータイプ</Label>
                  <Select value={reminderType} onValueChange={(value: any) => setReminderType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24時間前</SelectItem>
                      <SelectItem value="30m">30分前</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>科目名</Label>
                  <Input 
                    value={subjectName} 
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="例: 数学"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>授業日</Label>
                  <Input 
                    type="date" 
                    value={classDate}
                    onChange={(e) => setClassDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>授業時間</Label>
                  <Input 
                    type="time" 
                    value={classTime}
                    onChange={(e) => setClassTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="space-y-2">
            <Label>メッセージ内容</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="送信するメッセージを入力..."
              rows={6}
              className="font-mono text-sm"
              disabled={messageType === "class-reminder"}
            />
            <p className="text-xs text-muted-foreground">
              {message.length}文字
            </p>
          </div>

          {/* Send Button */}
          <Button
            onClick={sendMessage}
            disabled={loading || !message || selectedUsers.length === 0}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                送信中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                メッセージを送信 ({selectedUsers.length}名)
              </>
            )}
          </Button>

          {/* Results */}
          {results && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="text-sm font-medium">送信結果</h4>
              
              {results.success ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {results.summary.successful}件のメッセージが正常に送信されました。
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    送信に失敗しました。エラーの詳細を確認してください。
                  </AlertDescription>
                </Alert>
              )}

              {results.errors && results.errors.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-red-600">エラー詳細:</h5>
                  <div className="text-xs space-y-1">
                    {results.errors.map((error: any, index: number) => (
                      <div key={index} className="p-2 bg-red-50 rounded">
                        <p className="font-medium">{error.error}</p>
                        {error.details && (
                          <pre className="mt-1 overflow-x-auto">
                            {JSON.stringify(error.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}