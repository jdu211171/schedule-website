import { Subject } from "./types";
import { Badge } from "@/components/ui/badge";

const subjectTypeColors: Record<string, { bg: string, text: string }> = {
  "MATH": { bg: "bg-blue-100", text: "text-blue-800" },
  "SCIENCE": { bg: "bg-green-100", text: "text-green-800" },
  "LANGUAGE": { bg: "bg-purple-100", text: "text-purple-800" },
  "SOCIAL": { bg: "bg-amber-100", text: "text-amber-800" },
  "ARTS": { bg: "bg-pink-100", text: "text-pink-800" },
  "PHYSICAL": { bg: "bg-teal-100", text: "text-teal-800" },
  "DEFAULT": { bg: "bg-gray-100", text: "text-gray-800" }
};

interface SubjectBadgeProps {
  subject: Subject;
  size?: "sm" | "md" | "lg";
}

export default function SubjectBadge({ subject, size = "md" }: SubjectBadgeProps) {
  const subjectType = subject.subjectType?.name?.toUpperCase() || "DEFAULT";
  const colors = subjectTypeColors[subjectType] || subjectTypeColors.DEFAULT;
  
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-xs",
    lg: "px-2.5 py-1 text-sm"
  };
  
  return (
    <Badge 
      variant="outline"
      className={`${colors.bg} ${colors.text} ${sizeClasses[size]} rounded-full font-medium hover:${colors.bg}`}
    >
      {subject.name}
    </Badge>
  );
}