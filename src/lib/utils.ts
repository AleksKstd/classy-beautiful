import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `${price.toFixed(2)} €`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} мин.`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} ч.`;
  }
  return `${hours} ч. ${mins} мин.`;
}
