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
  // Определяем классы размера
  const sizeClass = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-sm",
    lg: "px-3 py-1.5 text-base"
  }[size];

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full font-medium whitespace-nowrap transition-all duration-200",
        sizeClass,
        
        // Базовые цвета для всех бейджей (светлая и темная тема)
        "bg-gray-100 text-gray-800 border-gray-200",
        "dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700",
        
        // Выделение только для контура (highlight=true)
        highlight && [
          // Золотистый контур с эффектом свечения
          "ring-2 ring-amber-400/80 dark:ring-amber-500/70",
          
          // Сохраняем базовые цвета текста и фона
          "border-amber-300 dark:border-amber-600",
          
          // Легкая тень для эффекта "приподнятости"
          "shadow-sm"
        ]
      )}
    >
      {subject.name}
    </Badge>
  );
}