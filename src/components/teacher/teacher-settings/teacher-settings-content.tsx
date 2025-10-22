"use client";

import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import TeacherSettingsChangePassword from "./teacher-settings-change-password";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  User,
  KeyRound,
  Bell,
  Shield,
  Palette,
  HelpCircle,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { useTeacherSettingsStore } from "./teacher-settings-store";

const sectionConfig = {
  profile: {
    title: "プロフィール設定",
    description: "個人情報とアカウント詳細を管理します",
    icon: User,
  },
  password: {
    title: "パスワードとセキュリティ",
    description: "パスワードとセキュリティ設定を更新します",
    icon: KeyRound,
  },
  notifications: {
    title: "通知設定",
    description: "通知の受信方法とタイミングを制御します",
    icon: Bell,
  },
  privacy: {
    title: "プライバシー設定",
    description: "プライバシーとデータ共有の設定を管理します",
    icon: Shield,
  },
  appearance: {
    title: "外観",
    description: "アカウントの見た目をカスタマイズします",
    icon: Palette,
  },
  help: {
    title: "ヘルプとサポート",
    description: "ヘルプを取得し、サポートに連絡します",
    icon: HelpCircle,
  },
};

function ProfileSection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>個人情報</CardTitle>
          <CardDescription>
            個人の詳細情報と連絡先情報を更新します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">姓</Label>
              <Input id="firstName" placeholder="姓を入力してください" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">名</Label>
              <Input id="lastName" placeholder="名を入力してください" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="メールアドレスを入力してください"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">電話番号</Label>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="電話番号を入力してください"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthdate">生年月日</Label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input id="birthdate" type="date" />
            </div>
          </div>
          <Button>変更を保存</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsSection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>メール通知</CardTitle>
          <CardDescription>
            受信したいメール通知を選択してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>授業更新</Label>
              <p className="text-sm text-muted-foreground">
                授業のお知らせや更新に関する通知を受け取る
              </p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>スケジュール変更</Label>
              <p className="text-sm text-muted-foreground">
                授業スケジュールの変更についてリマインダーを受け取る
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>生徒の出席</Label>
              <p className="text-sm text-muted-foreground">
                生徒の出席状況に関する通知を受け取る
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PrivacySection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>プライバシー制御</CardTitle>
          <CardDescription>
            プライバシー設定とデータ共有設定を管理します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>プロフィール表示</Label>
              <p className="text-sm text-muted-foreground">
                他の講師や生徒にプロフィールの表示を許可する
              </p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>アクティビティ状態</Label>
              <p className="text-sm text-muted-foreground">
                オンライン状態やアクティブ状態を表示する
              </p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>データ分析</Label>
              <p className="text-sm text-muted-foreground">
                プラットフォーム改善のための使用データを許可する
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AppearanceSection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>テーマ設定</CardTitle>
          <CardDescription>
            アカウントの外観をカスタマイズします
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>テーマ</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                ライト
              </Button>
              <Button variant="outline" size="sm">
                ダーク
              </Button>
              <Button variant="outline" size="sm">
                システム
              </Button>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>言語</Label>
            <div className="flex gap-2">
              <Badge variant="outline">English</Badge>
              <Badge variant="secondary">日本語</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HelpSection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ヘルプとサポート</CardTitle>
          <CardDescription>
            アカウントのヘルプを取得するか、サポートチームに連絡してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full justify-start">
            <HelpCircle className="mr-2 h-4 w-4" />
            ヘルプドキュメントを見る
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Mail className="mr-2 h-4 w-4" />
            サポートに連絡
          </Button>
          <Separator />
          <div className="text-sm text-muted-foreground">
            <p>すぐにサポートが必要ですか？</p>
            <p className="font-medium">メール: support@example.com</p>
            <p className="font-medium">電話: +81 (0)3-1234-5678</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function TeacherSettingsContent() {
  const { activeSection } = useTeacherSettingsStore();
  const config = sectionConfig[activeSection as keyof typeof sectionConfig];

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileSection />;
      case "password":
        return <TeacherSettingsChangePassword />;
      case "notifications":
        return <NotificationsSection />;
      case "privacy":
        return <PrivacySection />;
      case "appearance":
        return <AppearanceSection />;
      case "help":
        return <HelpSection />;
      default:
        return <ProfileSection />;
    }
  };

  return (
    <SidebarInset className="flex-1">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <config.icon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{config.title}</h1>
        </div>
      </header>
      <main className="flex-1 p-6">
        <div className="max-w-4xl">
          <div className="mb-6">
            <p className="text-muted-foreground">{config.description}</p>
          </div>
          {renderContent()}
        </div>
      </main>
    </SidebarInset>
  );
}
