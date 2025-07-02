"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Plus, Save, Trash2, Copy, Edit2, X, Check } from "lucide-react";
import { MESSAGE_VARIABLES, MessageTemplate, extractTemplateVariables, replaceTemplateVariables } from "@/lib/line/message-templates";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageTemplateEditorProps {
  templates: MessageTemplate[];
  onSave: (templates: MessageTemplate[]) => Promise<void>;
  isLoading?: boolean;
}

const formatTiming = (template: MessageTemplate) => {
  const unit = template.timingType === 'minutes' ? '分' : template.timingType === 'hours' ? '時間' : '日';
  const position = template.templateType === 'before_class' ? '前' : template.templateType === 'after_class' ? '後' : '';
  const timing = `${template.timingValue}${unit}${position}`;
  
  // Add time display for day-based templates
  if (template.timingType === 'days' && template.timingHour !== null && template.timingHour !== undefined) {
    const hour = String(template.timingHour).padStart(2, '0');
    return `${timing} ${hour}:00`;
  }
  
  return timing;
};

export function MessageTemplateEditor({ templates, onSave, isLoading }: MessageTemplateEditorProps) {
  const [localTemplates, setLocalTemplates] = useState<MessageTemplate[]>(templates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalTemplates(templates);
  }, [templates]);

  // Initialize preview values with examples
  useEffect(() => {
    const values: Record<string, string> = {};
    Object.entries(MESSAGE_VARIABLES).forEach(([_, variable]) => {
      const key = variable.key.replace(/[{}]/g, '');
      values[key] = variable.example;
    });
    setPreviewValues(values);
  }, []);

  const handleAddTemplate = () => {
    const newTemplate: MessageTemplate = {
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '新しいテンプレート',
      templateType: 'before_class',
      timingType: 'hours',
      timingValue: 24,
      timingHour: null,
      content: `授業のお知らせ

科目: {{subjectName}}
時間: {{startTime}} - {{endTime}}
講師: {{teacherName}}
場所: {{boothName}}`,
      variables: ['subjectName', 'startTime', 'endTime', 'teacherName', 'boothName'],
      isActive: true,
    };
    setLocalTemplates([newTemplate, ...localTemplates]);
    setEditingId(newTemplate.id!);
  };

  const handleUpdateTemplate = (id: string, updates: Partial<MessageTemplate>) => {
    setLocalTemplates(prevTemplates => prevTemplates.map(template => 
      template.id === id 
        ? { 
            ...template, 
            ...updates,
            variables: updates.content ? extractTemplateVariables(updates.content) : template.variables
          } 
        : template
    ));
  };

  const handleDeleteTemplate = (id: string) => {
    setLocalTemplates(localTemplates.filter(template => template.id !== id));
  };

  const handleSave = async () => {
    // Filter out templates with empty content
    const validTemplates = localTemplates.filter(template => template.content.trim().length > 0);
    
    if (validTemplates.length === 0) {
      // If no valid templates, show error
      return;
    }
    
    if (validTemplates.length < localTemplates.length) {
      // Some templates have empty content - we'll just save the valid ones
      const emptyCount = localTemplates.length - validTemplates.length;
      console.warn(`${emptyCount} template(s) with empty content will not be saved`);
    }
    
    setIsSaving(true);
    try {
      await onSave(validTemplates);
      setEditingId(null);
      // Update local state to remove empty templates
      setLocalTemplates(validTemplates);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (templateId: string, isActive: boolean) => {
    // Store previous state for rollback
    const previousTemplates = [...localTemplates];
    
    // Create updated templates
    const updatedTemplates = previousTemplates.map(template => 
      template.id === templateId 
        ? { ...template, isActive, variables: template.variables || extractTemplateVariables(template.content) }
        : { ...template, variables: template.variables || extractTemplateVariables(template.content) }
    );
    
    // Update local state immediately for responsive UI
    setLocalTemplates(updatedTemplates);
    
    // Save to database
    try {
      await onSave(updatedTemplates);
    } catch (error) {
      // Revert on error
      setLocalTemplates(previousTemplates);
      console.error('Failed to update template active state:', error);
    }
  };

  const getPreviewContent = (template: MessageTemplate) => {
    return replaceTemplateVariables(template.content, previewValues);
  };

  const insertVariable = (templateId: string, variableKey: string) => {
    const template = localTemplates.find(t => t.id === templateId);
    if (!template) return;

    const textarea = document.querySelector(`textarea[data-template-id="${templateId}"]`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = template.content;
    const newText = text.substring(0, start) + variableKey + text.substring(end);
    
    handleUpdateTemplate(templateId, { content: newText });
    
    // Restore cursor position
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
          メッセージに変数を挿入することで、送信時に実際の値に自動的に置き換えられます。
          変数をクリックしてテンプレートに挿入してください。
        </AlertDescription>
      </Alert>

      <Button onClick={handleAddTemplate} className="w-full">
        <Plus className="h-4 w-4 mr-1" />
        新しいテンプレートを作成
      </Button>

      <div className="space-y-4">
        {localTemplates.map((template) => (
          <Card key={template.id} className={editingId === template.id ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {editingId === template.id ? (
                    <Input
                      value={template.name}
                      onChange={(e) => handleUpdateTemplate(template.id!, { name: e.target.value })}
                      className="h-8 w-64"
                    />
                  ) : (
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  )}
                  <Badge variant={template.isActive ? "default" : "secondary"}>
                    {template.isActive ? "有効" : "無効"}
                  </Badge>
                  <Badge variant="outline">
                    {formatTiming(template)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`switch-${template.id}`}
                    checked={template.isActive}
                    onCheckedChange={(checked) => handleToggleActive(template.id!, checked)}
                  />
                  {editingId === template.id ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={isSaving}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(template.id!)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDeleteTemplate(template.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {editingId === template.id && (
                <div className="mt-2 space-y-2">
                  <Input
                    placeholder="説明（オプション）"
                    value={template.description || ''}
                    onChange={(e) => handleUpdateTemplate(template.id!, { description: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Select
                      value={template.templateType}
                      onValueChange={(value) => handleUpdateTemplate(template.id!, { 
                        templateType: value as MessageTemplate['templateType'] 
                      })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="before_class">授業前</SelectItem>
                        <SelectItem value="after_class">授業後</SelectItem>
                        <SelectItem value="custom">カスタム</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="999"
                        value={template.timingValue}
                        onChange={(e) => handleUpdateTemplate(template.id!, { 
                          timingValue: parseInt(e.target.value) || 1 
                        })}
                        className="w-20"
                      />
                      <Select
                        value={template.timingType}
                        onValueChange={(value) => handleUpdateTemplate(template.id!, { 
                          timingType: value as MessageTemplate['timingType'] 
                        })}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">分</SelectItem>
                          <SelectItem value="hours">時間</SelectItem>
                          <SelectItem value="days">日</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Time picker for day-based templates */}
                    {template.timingType === 'days' && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">送信時刻:</Label>
                        <Select
                          value={String(template.timingHour ?? 9)}
                          onValueChange={(value) => handleUpdateTemplate(template.id!, { 
                            timingHour: parseInt(value) 
                          })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {String(i).padStart(2, '0')}:00
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="edit">編集</TabsTrigger>
                  <TabsTrigger value="preview">プレビュー</TabsTrigger>
                </TabsList>
                
                <TabsContent value="edit" className="space-y-4">
                  {editingId === template.id && (
                    <div>
                      <Label className="text-sm font-medium mb-2">利用可能な変数</Label>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {Object.entries(MESSAGE_VARIABLES).map(([key, variable]) => (
                          <TooltipProvider key={key}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="secondary"
                                  className="cursor-pointer hover:bg-secondary/80"
                                  onClick={() => insertVariable(template.id!, variable.key)}
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
                  )}
                  
                  <Textarea
                    value={template.content}
                    onChange={(e) => handleUpdateTemplate(template.id!, { content: e.target.value })}
                    placeholder="メッセージ内容を入力..."
                    rows={8}
                    disabled={editingId !== template.id}
                    data-template-id={template.id}
                  />
                  
                  {template.variables.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      使用中の変数: {template.variables.map(v => `{{${v}}}`).join(', ')}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="preview">
                  <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                    {getPreviewContent(template)}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}