'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Calendar, Users, Clipboard, Database, Clock, RefreshCw 
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle'; // Импортируем компонент

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [userRole] = useState('admin'); // В будущем заменить на реальную роль пользователя

  // Навигационные пункты с учетом роли
  const navItems = [
    { 
      href: '/schedule', 
      label: '個人スケジュール', 
      icon: <Calendar className="h-5 w-5" />,
      roles: ['student', 'teacher', 'admin']
    },
    { 
      href: '/all-schedules', 
      label: '総合授業スケジュール', 
      icon: <Clipboard className="h-5 w-5" />,
      roles: ['admin']
    },
    { 
      href: '/matching', 
      label: '授業マッチング', 
      icon: <Users className="h-5 w-5" />,
      roles: ['admin']
    },
    { 
      href: '/masterData',
      label: 'マスタ登録管理', 
      icon: <Database className="h-5 w-5" />,
      roles: ['admin']
    },
    { 
      href: '/teachers', 
      label: '教師', 
      icon: <Clock className="h-5 w-5" />,
      roles: ['teacher', 'admin']
    },
    { 
      href: '/replacement', 
      label: '振替授業セッティング', 
      icon: <RefreshCw className="h-5 w-5" />,
      roles: ['student', 'teacher', 'admin']
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Верхняя панель навигации */}
      <header className="bg-card text-card-foreground shadow-md">
        <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center">
  <div className="py-4 text-xl font-bold">LightHouse</div>
  <div className="flex items-center overflow-x-auto">
    <nav className="mr-4">
      <ul className="flex space-x-1">
        {navItems.filter(item => item.roles.includes(userRole)).map((item) => (
          <li key={item.href}>
            <Link 
              href={item.href}
              className={`flex items-center px-2 py-4 whitespace-nowrap hover:bg-accent ${
                pathname === item.href ? 'bg-accent border-b-2 border-primary' : ''
              }`}
            >
              {item.icon}
              <span className="ml-1 text-sm">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
    <ThemeToggle />
  </div>
</div>
        </div>
      </header>
      
      {/* Основной контент */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          {navItems.find(item => item.href === pathname)?.label || 'ダッシュボード'}
        </h1>
        {children}
      </main>
    </div>
  );
}