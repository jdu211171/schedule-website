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
  const getSubjectColor = (subjectName: string) => {
    const nameHash = subjectName.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    const colors = [
      { bg: "bg-blue-100", text: "text-blue-800" },
      { bg: "bg-green-100", text: "text-green-800" },
      { bg: "bg-yellow-100", text: "text-yellow-800" },
      { bg: "bg-red-100", text: "text-red-800" },
      { bg: "bg-purple-100", text: "text-purple-800" },
      { bg: "bg-indigo-100", text: "text-indigo-800" },
      { bg: "bg-pink-100", text: "text-pink-800" },
      { bg: "bg-teal-100", text: "text-teal-800" },
    ];
    
    const colorIndex = nameHash % colors.length;
    return colors[colorIndex];
  };
  
  const { bg, text } = getSubjectColor(subject.name);
  
  const highlightBg = highlight ? bg.replace('-100', '-200') : bg;
  const highlightText = highlight ? text : text;
  const highlightBorder = highlight ? 'border-2 border-yellow-400' : '';
  
  const sizeClass = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-sm",
    lg: "px-3 py-1.5 text-base"
  }[size];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        highlightBg, 
        highlightText,
        sizeClass,
        "rounded-full font-medium whitespace-nowrap",
        highlightBorder, 
        highlight && "shadow-md" 
      )}
    >
      {subject.name}
    </Badge>
  );
}