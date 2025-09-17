export const SPECIAL_CLASS_ROOT_NAME = "特別授業";

export const SPECIAL_CLASS_COLOR_HEX = "#FDC5F5";

export const SPECIAL_CLASS_COLOR_CLASSES = {
  background: "bg-[#FDC5F5]/80 dark:bg-[#FDC5F5]/15",
  border: "border-[#F3A8E7] dark:border-[#FDC5F5]/30",
  text: "text-[#7A1F63] dark:text-[#FDE6F8]",
  hover: "hover:bg-[#FBD3F7] dark:hover:bg-[#FDC5F5]/25",
  icon: "text-[#B83286] dark:text-[#F6B5E9]",
  dot: "bg-[#F06BD8]",
  legendFill: "bg-[#FDC5F5] border border-[#F3A8E7] dark:bg-[#FDC5F5]/20 dark:border-[#F6BAEC]",
  legendText: "text-[#A1327D] dark:text-[#F6C5E9]",
  chipBg: "bg-[#FDE6FA]",
  chipBorder: "border-[#F3A8E7]",
  chipText: "text-[#A1327D]",
  swatch: "bg-[#F378D9]",
} as const;

export type SpecialClassColorClasses = typeof SPECIAL_CLASS_COLOR_CLASSES;
