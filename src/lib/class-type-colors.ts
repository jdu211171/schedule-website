// Default palette for class type colors and their Tailwind class mappings
// Keys are stored in DB (string), values map to Tailwind classes for Day View
export const CLASS_TYPE_DEFAULT_COLORS = [
  'blue',
  'dark blue',
  'cyan',
  'orange',
  'yellow',
  'red',
  'dark green',
  'lighter green',
] as const;

export type ClassTypeColor = (typeof CLASS_TYPE_DEFAULT_COLORS)[number];

export const classTypeColorClasses: Record<ClassTypeColor, {
  background: string;
  border: string;
  text: string;
  hover: string;
  swatch: string; // for palette button
  chipBg: string; // subtle bg for saturation box
  chipBorder: string;
  chipText: string;
  dot: string; // saturated small dot color
}> = {
  'blue': {
    background: 'bg-blue-100 dark:bg-blue-900/70',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-100',
    hover: 'hover:bg-blue-200 dark:hover:bg-blue-800',
    swatch: 'bg-blue-500',
    chipBg: 'bg-blue-100',
    chipBorder: 'border-blue-300',
    chipText: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  'dark blue': {
    background: 'bg-indigo-100 dark:bg-indigo-900/70',
    border: 'border-indigo-300 dark:border-indigo-700',
    text: 'text-indigo-800 dark:text-indigo-100',
    hover: 'hover:bg-indigo-200 dark:hover:bg-indigo-800',
    swatch: 'bg-indigo-700',
    chipBg: 'bg-indigo-100',
    chipBorder: 'border-indigo-300',
    chipText: 'text-indigo-700',
    dot: 'bg-indigo-600',
  },
  'cyan': {
    background: 'bg-cyan-100 dark:bg-cyan-900/70',
    border: 'border-cyan-300 dark:border-cyan-700',
    text: 'text-cyan-800 dark:text-cyan-100',
    hover: 'hover:bg-cyan-200 dark:hover:bg-cyan-800',
    swatch: 'bg-cyan-500',
    chipBg: 'bg-cyan-100',
    chipBorder: 'border-cyan-300',
    chipText: 'text-cyan-700',
    dot: 'bg-cyan-500',
  },
  'orange': {
    background: 'bg-orange-100 dark:bg-orange-900/70',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-800 dark:text-orange-100',
    hover: 'hover:bg-orange-200 dark:hover:bg-orange-800',
    swatch: 'bg-orange-500',
    chipBg: 'bg-orange-100',
    chipBorder: 'border-orange-300',
    chipText: 'text-orange-700',
    dot: 'bg-orange-500',
  },
  'yellow': {
    background: 'bg-yellow-100 dark:bg-yellow-900/70',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-800 dark:text-yellow-100',
    hover: 'hover:bg-yellow-200 dark:hover:bg-yellow-800',
    swatch: 'bg-yellow-400',
    chipBg: 'bg-yellow-100',
    chipBorder: 'border-yellow-300',
    chipText: 'text-yellow-700',
    dot: 'bg-yellow-500',
  },
  'red': {
    background: 'bg-red-100 dark:bg-red-900/70',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-800 dark:text-red-100',
    hover: 'hover:bg-red-200 dark:hover:bg-red-800',
    swatch: 'bg-red-500',
    chipBg: 'bg-red-100',
    chipBorder: 'border-red-300',
    chipText: 'text-red-700',
    dot: 'bg-red-500',
  },
  'dark green': {
    background: 'bg-emerald-100 dark:bg-emerald-900/70',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-100',
    hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-800',
    swatch: 'bg-emerald-700',
    chipBg: 'bg-emerald-100',
    chipBorder: 'border-emerald-300',
    chipText: 'text-emerald-700',
    dot: 'bg-emerald-600',
  },
  'lighter green': {
    background: 'bg-green-100 dark:bg-green-900/70',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-800 dark:text-green-100',
    hover: 'hover:bg-green-200 dark:hover:bg-green-800',
    swatch: 'bg-green-400',
    chipBg: 'bg-green-100',
    chipBorder: 'border-green-300',
    chipText: 'text-green-700',
    dot: 'bg-green-500',
  },
};

export const classTypeColorJaLabels: Record<ClassTypeColor, string> = {
  'blue': '青',
  'dark blue': '濃い青',
  'cyan': '水色',
  'orange': 'オレンジ',
  'yellow': '黄色',
  'red': '赤',
  'dark green': '濃い緑',
  'lighter green': '明るい緑',
};

// Representative hex codes for default palette (Tailwind scale references)
export const CLASS_TYPE_COLOR_HEX: Record<ClassTypeColor, string> = {
  'blue': '#3b82f6',          // blue-500
  'dark blue': '#4f46e5',     // indigo-600
  'cyan': '#06b6d4',          // cyan-500
  'orange': '#f97316',        // orange-500
  'yellow': '#f59e0b',        // amber/yellow-500
  'red': '#ef4444',           // red-500
  'dark green': '#059669',    // emerald-600
  'lighter green': '#4ade80', // green-400
};

export function getHexForClassTypeColor(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isHexColor(value)) return value;
  if ((CLASS_TYPE_DEFAULT_COLORS as readonly string[]).includes(value)) {
    return CLASS_TYPE_COLOR_HEX[value as ClassTypeColor];
  }
  return null;
}

export function isValidClassTypeColor(value: string | null | undefined): value is ClassTypeColor {
  return !!value && (CLASS_TYPE_DEFAULT_COLORS as readonly string[]).includes(value);
}

// Helpers for custom HEX colors
export function isHexColor(value: string | null | undefined): value is string {
  return !!value && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isHexColor(hex)) return null;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return { r, g, b };
}

export function rgba(hex: string, alpha: number): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function getContrastText(hex: string): 'black' | 'white' {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'black';
  // YIQ formula for contrast
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 128 ? 'black' : 'white';
}
