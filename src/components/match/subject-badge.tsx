import { cn } from "@/lib/utils";
import { Subject } from "@/components/match/types";
import { Badge } from "@/components/ui/badge";

interface SubjectBadgeProps {
  subject: Subject;
  size?: "sm" | "md" | "lg";
  highlight?: boolean;
}

export default function SubjectBadge({
                                       subject,
                                       size = "md",
                                       highlight = false
                                     }: SubjectBadgeProps) {
  // Монохромная палитра вместо цветной
  const getMonochromeStyle = () => {
    // Генерируем разные оттенки серого на основе имени предмета
    const nameHash = subject.name.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);

    // Разные уровни серого для светлой и темной темы
    const lightModeVariations = [
      { bg: "bg-gray-100", text: "text-gray-800" },
      { bg: "bg-gray-200", text: "text-gray-900" },
      { bg: "bg-gray-50", text: "text-gray-700" },
      { bg: "bg-stone-100", text: "text-stone-800" },
      { bg: "bg-zinc-100", text: "text-zinc-800" },
      { bg: "bg-slate-100", text: "text-slate-800" }
    ];

    // Используем хеш для выбора вариации
    const variationIndex = nameHash % lightModeVariations.length;
    return lightModeVariations[variationIndex];
  };

  const { bg, text } = getMonochromeStyle();

  const sizeClass = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-sm",
    lg: "px-3 py-1.5 text-base"
  }[size];

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full font-medium whitespace-nowrap",
        sizeClass,
        // Свветлая тема
        bg,
        text,
        // Темная тема
        "dark:bg-gray-800 dark:text-gray-200",
        // Стиль при выделении
        highlight && "border dark:border-gray-600 shadow-sm bg-gray-200 dark:bg-gray-700"
      )}
    >
      {subject.name}
    </Badge>
  );
}
