import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAmount(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  // Use Intl.NumberFormat for clean formatting. 
  // Strictly enforce no decimals as requested by setting maximumFractionDigits to 0.
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(num);
}
