'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Здесь будет настоящая логика входа
    console.log('Logging in with:', email, password);
    
    // Просто перенаправляем на главную страницу
    router.push('/schedule');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">授業スケジュールシステム</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                メールアドレス
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                パスワード
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                required
              />
            </div>
            
            <Button type="submit" className="w-full">
              ログイン
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}