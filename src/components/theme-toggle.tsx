// components/ThemeToggle.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  // Инициализация темы из localStorage или системных настроек
  useEffect(() => {
    // Проверяем localStorage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setDarkMode(savedTheme === "dark");
    } else {
      // Если нет в localStorage, проверяем системные настройки
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(prefersDark);
    }
  }, []);

  // Применяем тему при изменении
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Сохраняем предпочтение в localStorage
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <Button
      variant="outline"
      size="icon"
      className="rounded-full transition-colors bg-transparent border-0 hover:bg-gray-700 dark:hover:bg-gray-600"
      onClick={() => setDarkMode(!darkMode)}
      aria-label="Toggle theme"
    >
      <Moon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Sun className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}