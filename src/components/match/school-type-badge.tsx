// // import { ExamSchoolCategoryType } from "./types";
// import { Badge } from "@/components/ui/badge";

// const schoolTypeColors: Record<string, { bg: string, text: string }> = {
//   "ELEMENTARY": { bg: "bg-green-100", text: "text-green-800" },
//   "MIDDLE": { bg: "bg-blue-100", text: "text-blue-800" },
//   "HIGH": { bg: "bg-purple-100", text: "text-purple-800" },
//   "UNIVERSITY": { bg: "bg-amber-100", text: "text-amber-800" },
//   "OTHER": { bg: "bg-gray-100", text: "text-gray-800" }
// };

// // Текстовые метки для типов школ на японском
// const schoolTypeLabels: Record<string, string> = {
//   "ELEMENTARY": "小学校",
//   "MIDDLE": "中学校",
//   "HIGH": "高校",
//   "UNIVERSITY": "大学",
//   "OTHER": "その他"
// };

// // interface SchoolTypeBadgeProps {
// //   type: ExamSchoolCategoryType;
// //   size?: "sm" | "md" | "lg";
// // }

// // export default function SchoolTypeBadge({ type, size = "md" }: SchoolTypeBadgeProps) {
// //   const colors = schoolTypeColors[type] || schoolTypeColors.OTHER;
// //   const label = schoolTypeLabels[type] || type;
  
//   const sizeClasses = {
//     sm: "px-1.5 py-0.5 text-xs",
//     md: "px-2 py-1 text-xs",
//     lg: "px-2.5 py-1 text-sm"
//   };
  
//   return (
//     <Badge 
//       variant="outline"
//       className={`${colors.bg} ${colors.text} ${sizeClasses[size]} rounded-full font-medium hover:${colors.bg}`}
//     >
//       {label}
//     </Badge>
//   );
// }