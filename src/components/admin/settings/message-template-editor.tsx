"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Edit2, X, Check, FileText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MESSAGE_VARIABLES, MessageTemplate, extractTemplateVariables, replaceTemplateVariables, TEMPLATE_EXAMPLES, CLASS_ITEM_VARIABLES, CLASS_LIST_FORMAT_EXAMPLES, DEFAULT_CLASS_LIST_ITEM_TEMPLATE, DEFAULT_CLASS_LIST_SUMMARY_TEMPLATE } from "@/lib/line/message-templates";

interface MessageTemplateEditorProps {
  templates: MessageTemplate[];
  onSave: (templates: MessageTemplate[]) => Promise<void>;
  isLoading?: boolean;
}

const formatTiming = (template: MessageTemplate) => {
  const timing = template.timingValue === 0 ? '当日' : `${template.timingValue}日前`;
  const hour = String(template.timingHour).padStart(2, '0');
  const minute = String(template.timingMinute ?? 0).padStart(2, '0');
  return `${timing} ${hour}:${minute}`;
};

export function MessageTemplateEditor({ templates, onSave }: MessageTemplateEditorProps) {
  // SINGLE NOTIFICATION: Always work with exactly one template
  const [localTemplate, setLocalTemplate] = useState<MessageTemplate>(
    templates[0] || {
      id: 'single-notification',
      name: '毎日の授業通知',
      templateType: 'before_class',
      timingType: 'days',
      timingValue: 1,
      timingHour: 9,
      timingMinute: 0,
      content: `明日の授業予定\n\n{{dailyClassList}}\n\nよろしくお願いいたします。`,
      variables: ['dailyClassList'],
      classListItemTemplate: DEFAULT_CLASS_LIST_ITEM_TEMPLATE,
      classListSummaryTemplate: DEFAULT_CLASS_LIST_SUMMARY_TEMPLATE,
      isActive: true,
    }
  );
  const [isEditing, setIsEditing] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (templates.length > 0) {
      setLocalTemplate(templates[0]);
    }
  }, [templates]);

  // Sample class data for preview
  const sampleClasses = [
    {
      classNumber: '1',
      subjectName: '数学',
      startTime: '10:00',
      endTime: '11:30',
      teacherName: '田中先生',
      boothName: 'ブース A',
      duration: '90分',
      studentName: '山田太郎'
    },
    {
      classNumber: '2',
      subjectName: '英語',
      startTime: '13:00',
      endTime: '14:30',
      teacherName: '佐藤先生',
      boothName: 'ブース B',
      duration: '90分',
      studentName: '鈴木花子'
    },
    {
      classNumber: '3',
      subjectName: '物理',
      startTime: '15:00',
      endTime: '16:30',
      teacherName: '山田先生',
      boothName: 'ブース C',
      duration: '90分',
      studentName: '佐藤三郎'
    }
  ];

  // Function to generate dynamic dailyClassList preview
  const generateDailyClassListPreview = (itemTemplate: string, summaryTemplate: string) => {
    // Generate class list items
    const classListItems = sampleClasses.map((classData) => {
      let itemText = itemTemplate;
      // Replace all variables in the item template
      Object.entries(classData).forEach(([key, value]) => {
        itemText = itemText.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
      return itemText;
    }).join('\n\n');

    // Generate summary
    let summaryText = '';
    if (summaryTemplate) {
      summaryText = summaryTemplate;
      // Replace summary variables
      summaryText = summaryText.replace(/{{classCount}}/g, '3');
      summaryText = summaryText.replace(/{{firstClassTime}}/g, '10:00');
      summaryText = summaryText.replace(/{{lastClassTime}}/g, '16:30');
    }

    // Combine class list and summary
    return summaryText ? `${classListItems}\n\n${summaryText}` : classListItems;
  };

  // Function to calculate all dynamic preview values based on sample data
  const calculatePreviewValues = (itemTemplate: string, summaryTemplate: string) => {
    const values: Record<string, string> = {};
    
    // Initialize with static examples from MESSAGE_VARIABLES
    Object.entries(MESSAGE_VARIABLES).forEach(([_, variable]) => {
      const key = variable.key.replace(/[{}]/g, '');
      values[key] = variable.example;
    });

    // Calculate dynamic values based on sample class data
    values['classCount'] = String(sampleClasses.length);
    values['firstClassTime'] = sampleClasses[0].startTime;
    values['lastClassTime'] = sampleClasses[sampleClasses.length - 1].endTime;
    
    // Calculate total duration
    const totalMinutes = sampleClasses.length * 90; // Each class is 90 minutes
    const totalHours = totalMinutes / 60;
    values['totalDuration'] = totalHours % 1 === 0 ? `${totalHours}時間` : `${totalHours.toFixed(1)}時間`;
    
    
    // Generate dailyClassList preview
    values['dailyClassList'] = generateDailyClassListPreview(itemTemplate, summaryTemplate);
    
    // Use realistic values for other variables
    values['recipientName'] = '山田太郎';
    values['recipientType'] = '生徒';
    values['classDate'] = '2025年7月20日';
    values['currentDate'] = '2025年7月19日';
    values['branchName'] = '東京校';
    
    return values;
  };

  // Initialize preview values with calculated data
  useEffect(() => {
    const itemTemplate = localTemplate.classListItemTemplate || DEFAULT_CLASS_LIST_ITEM_TEMPLATE;
    const summaryTemplate = localTemplate.classListSummaryTemplate || DEFAULT_CLASS_LIST_SUMMARY_TEMPLATE;
    const values = calculatePreviewValues(itemTemplate, summaryTemplate);
    setPreviewValues(values);
  }, []);

  // Update all preview values when templates change
  useEffect(() => {
    const itemTemplate = localTemplate.classListItemTemplate || DEFAULT_CLASS_LIST_ITEM_TEMPLATE;
    const summaryTemplate = localTemplate.classListSummaryTemplate || DEFAULT_CLASS_LIST_SUMMARY_TEMPLATE;
    const values = calculatePreviewValues(itemTemplate, summaryTemplate);
    setPreviewValues(values);
  }, [localTemplate.classListItemTemplate, localTemplate.classListSummaryTemplate]);

  // Remove handleAddTemplate - we only allow one template

  const handleUpdateTemplate = (updates: Partial<MessageTemplate>) => {
    setLocalTemplate(prev => ({ 
      ...prev, 
      ...updates,
      variables: updates.content ? extractTemplateVariables(updates.content) : prev.variables
    }));
  };

  // Remove handleDeleteTemplate - we can't delete the single template

  const handleSave = async () => {
    if (!localTemplate.content.trim()) {
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave([localTemplate]);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    const previousTemplate = { ...localTemplate };
    const updatedTemplate = { ...localTemplate, isActive };
    
    setLocalTemplate(updatedTemplate);
    
    try {
      await onSave([updatedTemplate]);
    } catch (error) {
      setLocalTemplate(previousTemplate);
      console.error('Failed to update template active state:', error);
    }
  };

  const getPreviewContent = () => {
    return replaceTemplateVariables(localTemplate.content, previewValues);
  };

  const insertVariable = (variableKey: string) => {
    const textarea = document.querySelector('textarea[data-template-id="single"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = localTemplate.content;
    const newText = text.substring(0, start) + variableKey + text.substring(end);
    
    handleUpdateTemplate({ content: newText });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variableKey.length, start + variableKey.length);
    }, 0);
  };


  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>毎日、設定した時刻にその日の全ての授業をまとめた通知が送信されます。</p>
            <p className="text-sm">例: 「1日前 09:00」に設定すると、毎日朝9時に翌日の全授業予定が通知されます。</p>
            <p className="text-sm font-medium">テンプレートを選んでメッセージをカスタマイズできます。</p>
          </div>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">毎日の授業通知</CardTitle>
              <Badge variant={localTemplate.isActive ? "default" : "secondary"}>
                {localTemplate.isActive ? "有効" : "無効"}
              </Badge>
              <Badge variant="outline">
                {formatTiming(localTemplate)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="notification-switch"
                checked={localTemplate.isActive}
                onCheckedChange={(checked) => handleToggleActive(checked)}
              />
              {isEditing ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    <Check className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {isEditing && (
            <div className="mt-4 space-y-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">通知タイミング:</Label>
                  <Input
                    type="number"
                    min="0"
                    max="7"
                    value={localTemplate.timingValue}
                    onChange={(e) => handleUpdateTemplate({ 
                      timingValue: parseInt(e.target.value) || 0 
                    })}
                    className="w-20"
                  />
                  <span className="text-sm font-medium">日前</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label className="text-sm">送信時刻:</Label>
                  <Select
                    value={String(localTemplate.timingHour)}
                    onValueChange={(value) => handleUpdateTemplate({ 
                      timingHour: parseInt(value) 
                    })}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {String(i).padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm">:</span>
                  <Select
                    value={String(localTemplate.timingMinute ?? 0)}
                    onValueChange={(value) => handleUpdateTemplate({ 
                      timingMinute: parseInt(value) 
                    })}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((minute) => (
                        <SelectItem key={minute} value={String(minute)}>
                          {String(minute).padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="edit">編集</TabsTrigger>
              <TabsTrigger value="format">授業リスト形式</TabsTrigger>
              <TabsTrigger value="preview">プレビュー</TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit" className="space-y-4">
              {isEditing && (
                <>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      変数をクリックしてメッセージに挿入できます。プレビューで実際の表示を確認してください。
                    </AlertDescription>
                  </Alert>
                  
                  {/* Check if template contains old variables */}
                  {(localTemplate.content.includes('{{subjectName}}') || 
                    localTemplate.content.includes('{{startTime}}') || 
                    localTemplate.content.includes('{{endTime}}') || 
                    localTemplate.content.includes('{{teacherName}}') || 
                    localTemplate.content.includes('{{boothName}}')) && (
                    <Alert className="border-orange-200 bg-orange-50">
                      <Info className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        このテンプレートには古い変数が含まれています。新しいシステムでは、全ての授業情報は
                        <span className="font-medium"> {`{{dailyClassList}}`} </span>
                        に含まれます。テンプレート例から新しい形式を選択することをお勧めします。
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-4">
                    {/* Daily Summary Variables */}
                    <div>
                      <Label className="text-sm font-medium mb-2">授業情報</Label>
                      <div className="flex flex-wrap gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80"
                                onClick={() => insertVariable(MESSAGE_VARIABLES.DAILY_CLASS_LIST.key)}
                              >
                                {MESSAGE_VARIABLES.DAILY_CLASS_LIST.label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{MESSAGE_VARIABLES.DAILY_CLASS_LIST.key}</p>
                              <p className="text-xs">{MESSAGE_VARIABLES.DAILY_CLASS_LIST.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        {[MESSAGE_VARIABLES.CLASS_COUNT, MESSAGE_VARIABLES.FIRST_CLASS_TIME, 
                          MESSAGE_VARIABLES.LAST_CLASS_TIME, MESSAGE_VARIABLES.TOTAL_DURATION].map((variable) => (
                          <TooltipProvider key={variable.key}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="cursor-pointer hover:bg-secondary/80"
                                  onClick={() => insertVariable(variable.key)}
                                >
                                  {variable.label}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">{variable.key}</p>
                                <p className="text-xs">{variable.description}</p>
                                <p className="text-xs text-muted-foreground">例: {variable.example}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                    
                    {/* Recipient Variables */}
                    <div>
                      <Label className="text-sm font-medium mb-2">受信者情報</Label>
                      <div className="flex flex-wrap gap-2">
                        {[MESSAGE_VARIABLES.RECIPIENT_NAME, MESSAGE_VARIABLES.RECIPIENT_TYPE].map((variable) => (
                          <TooltipProvider key={variable.key}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="cursor-pointer hover:bg-secondary/80"
                                  onClick={() => insertVariable(variable.key)}
                                >
                                  {variable.label}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">{variable.key}</p>
                                <p className="text-xs">{variable.description}</p>
                                <p className="text-xs text-muted-foreground">例: {variable.example}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                    
                    {/* Date and Other Variables */}
                    <div>
                      <Label className="text-sm font-medium mb-2">日付・その他</Label>
                      <div className="flex flex-wrap gap-2">
                        {[MESSAGE_VARIABLES.CLASS_DATE, MESSAGE_VARIABLES.CURRENT_DATE, 
                          MESSAGE_VARIABLES.BRANCH_NAME].map((variable) => (
                          <TooltipProvider key={variable.key}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="cursor-pointer hover:bg-secondary/80"
                                  onClick={() => insertVariable(variable.key)}
                                >
                                  {variable.label}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">{variable.key}</p>
                                <p className="text-xs">{variable.description}</p>
                                <p className="text-xs text-muted-foreground">例: {variable.example}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                    
                    {/* Template Examples */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">テンプレート例</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-2" />
                              テンプレートを選択
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {Object.entries(TEMPLATE_EXAMPLES).map(([key, template]) => (
                              <DropdownMenuItem
                                key={key}
                                onClick={() => handleUpdateTemplate({ content: template.content })}
                              >
                                {template.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <Textarea
                value={localTemplate.content}
                onChange={(e) => handleUpdateTemplate({ content: e.target.value })}
                placeholder="メッセージ内容を入力..."
                rows={8}
                disabled={!isEditing}
                data-template-id="single"
              />
            </TabsContent>
            
            <TabsContent value="format" className="space-y-4">
              {isEditing ? (
                <>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      授業リストの表示形式をカスタマイズできます。各授業の表示方法とサマリー行を個別に設定できます。
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-4">
                    {/* Preset Format Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">プリセット形式</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-2" />
                              形式を選択
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {Object.entries(CLASS_LIST_FORMAT_EXAMPLES).map(([key, format]) => (
                              <DropdownMenuItem
                                key={key}
                                onClick={() => handleUpdateTemplate({ 
                                  classListItemTemplate: format.itemTemplate,
                                  classListSummaryTemplate: format.summaryTemplate
                                })}
                              >
                                {format.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    {/* Class Item Template */}
                    <div>
                      <Label className="text-sm font-medium mb-2">授業項目の形式</Label>
                      <div className="mb-2">
                        <Label className="text-xs text-muted-foreground">使用可能な変数:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.values(CLASS_ITEM_VARIABLES).map((variable) => (
                            <TooltipProvider key={variable.key}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="cursor-pointer hover:bg-secondary/80 text-xs"
                                    onClick={() => {
                                      const textarea = document.querySelector('textarea[data-template-id="class-item"]') as HTMLTextAreaElement;
                                      if (!textarea) return;
                                      const start = textarea.selectionStart;
                                      const end = textarea.selectionEnd;
                                      const text = localTemplate.classListItemTemplate || '';
                                      const newText = text.substring(0, start) + variable.key + text.substring(end);
                                      handleUpdateTemplate({ classListItemTemplate: newText });
                                      setTimeout(() => {
                                        textarea.focus();
                                        textarea.setSelectionRange(start + variable.key.length, start + variable.key.length);
                                      }, 0);
                                    }}
                                  >
                                    {variable.label}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">{variable.key}</p>
                                  <p className="text-xs">{variable.description}</p>
                                  <p className="text-xs text-muted-foreground">例: {variable.example}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>
                      <Textarea
                        value={localTemplate.classListItemTemplate || DEFAULT_CLASS_LIST_ITEM_TEMPLATE}
                        onChange={(e) => handleUpdateTemplate({ classListItemTemplate: e.target.value })}
                        placeholder="授業項目の表示形式..."
                        rows={4}
                        data-template-id="class-item"
                      />
                    </div>
                    
                    {/* Summary Template */}
                    <div>
                      <Label className="text-sm font-medium mb-2">サマリー行の形式</Label>
                      <div className="mb-2">
                        <Label className="text-xs text-muted-foreground">使用可能な変数:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[MESSAGE_VARIABLES.CLASS_COUNT, MESSAGE_VARIABLES.FIRST_CLASS_TIME, MESSAGE_VARIABLES.LAST_CLASS_TIME].map((variable) => (
                            <TooltipProvider key={variable.key}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="cursor-pointer hover:bg-secondary/80 text-xs"
                                    onClick={() => {
                                      const textarea = document.querySelector('textarea[data-template-id="class-summary"]') as HTMLTextAreaElement;
                                      if (!textarea) return;
                                      const start = textarea.selectionStart;
                                      const end = textarea.selectionEnd;
                                      const text = localTemplate.classListSummaryTemplate || '';
                                      const newText = text.substring(0, start) + variable.key + text.substring(end);
                                      handleUpdateTemplate({ classListSummaryTemplate: newText });
                                      setTimeout(() => {
                                        textarea.focus();
                                        textarea.setSelectionRange(start + variable.key.length, start + variable.key.length);
                                      }, 0);
                                    }}
                                  >
                                    {variable.label}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">{variable.key}</p>
                                  <p className="text-xs">{variable.description}</p>
                                  <p className="text-xs text-muted-foreground">例: {variable.example}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>
                      <Textarea
                        value={localTemplate.classListSummaryTemplate || DEFAULT_CLASS_LIST_SUMMARY_TEMPLATE}
                        onChange={(e) => handleUpdateTemplate({ classListSummaryTemplate: e.target.value })}
                        placeholder="サマリー行の表示形式..."
                        rows={2}
                        data-template-id="class-summary"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    編集モードに切り替えて、授業リストの形式をカスタマイズしてください。
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="preview">
              {/* Show note if template contains old variables */}
              {(localTemplate.content.includes('{{subjectName}}') || 
                localTemplate.content.includes('{{startTime}}') || 
                localTemplate.content.includes('{{endTime}}') || 
                localTemplate.content.includes('{{teacherName}}') || 
                localTemplate.content.includes('{{boothName}}')) && (
                <Alert className="mb-4 border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    注: このプレビューでは古い変数にサンプルデータを表示していますが、
                    実際の通知では全ての授業情報が{`{{dailyClassList}}`}に統合されます。
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                {getPreviewContent()}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

    </div>
  );
}