"use client";

import { useState } from "react";
import { 
  Copy, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  MessageSquare,
  Link,
  Unlink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

interface LineLinkingProps {
  userId: string;
  userType: "student" | "teacher";
  userName: string;
  lineId?: string | null;
}

interface LineLinkingData {
  userId: string;
  name: string;
  linkingCode: string | null;
  isLinked: boolean;
}

export function LineLinking({ 
  userId, 
  userType, 
  userName, 
  lineId: initialLineId
}: LineLinkingProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = [`${userType}-linking`, userId];

  // Use initial data if provided
  const { data: linkingData } = useQuery<LineLinkingData>({
    queryKey,
    queryFn: async () => ({
      userId,
      name: userName,
      linkingCode: null,
      isLinked: !!initialLineId
    }),
    initialData: {
      userId,
      name: userName,
      linkingCode: null,
      isLinked: !!initialLineId
    },
    staleTime: 0
  });

  // Generate linking code mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const endpoint = userType === "student" 
        ? `/api/students/${userId}/linking-code`
        : `/api/teachers/${userId}/linking-code`;
      
      const response = await axios.post(endpoint);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      toast({
        title: "リンクコード生成完了",
        description: "LINEでこのコードを送信してください。",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "リンクコードの生成に失敗しました。",
      });
    }
  });

  // Clear linking code mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      const endpoint = userType === "student" 
        ? `/api/students/${userId}/linking-code`
        : `/api/teachers/${userId}/linking-code`;
      
      const response = await axios.delete(endpoint);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      toast({
        title: "リンクコードをクリアしました",
        description: "新しいコードを生成できます。",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "リンクコードのクリアに失敗しました。",
      });
    }
  });

  const copyToClipboard = async () => {
    if (!linkingData?.linkingCode) return;
    
    try {
      await navigator.clipboard.writeText(linkingData.linkingCode);
      setIsCopied(true);
      toast({
        title: "コピーしました",
        description: "リンクコードをクリップボードにコピーしました。",
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "クリップボードへのコピーに失敗しました。",
      });
    }
  };

  const isLinked = linkingData?.isLinked || false;
  const hasLinkingCode = !!linkingData?.linkingCode;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              LINE連携
            </CardTitle>
            <CardDescription>
              LINEアカウントと連携して授業の通知を受け取ります
            </CardDescription>
          </div>
          <Badge variant={isLinked ? "default" : "secondary"}>
            {isLinked ? (
              <>
                <Link className="h-3 w-3 mr-1" />
                連携済み
              </>
            ) : (
              <>
                <Unlink className="h-3 w-3 mr-1" />
                未連携
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLinked ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              LINEアカウントが連携されています。授業の24時間前と30分前に通知が送信されます。
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {hasLinkingCode ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    以下のコードをLINE公式アカウント (@992emavw) に送信してください。
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="text"
                        value={linkingData.linkingCode || ""}
                        readOnly
                        className="w-full px-4 py-2 pr-20 text-lg font-mono text-center bg-gray-50 border rounded-md"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={copyToClipboard}
                      >
                        {isCopied ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearMutation.mutate()}
                    disabled={clearMutation.isPending}
                  >
                    コードをクリア
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    リンクコードを生成してLINEアカウントと連携してください。
                  </AlertDescription>
                </Alert>
                
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="w-full"
                >
                  {generateMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      リンクコードを生成
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
        
        <div className="pt-2 border-t">
          <h4 className="text-sm font-medium mb-2">連携手順:</h4>
          <ol className="text-sm text-muted-foreground space-y-1">
            <li>1. リンクコードを生成</li>
            <li>2. LINE公式アカウント (@992emavw) を友だち追加</li>
            <li>3. トーク画面でリンクコードを送信</li>
            <li>4. 連携完了のメッセージが届きます</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}