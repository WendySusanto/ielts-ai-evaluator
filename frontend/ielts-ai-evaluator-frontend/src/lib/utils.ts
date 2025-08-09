import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatText = (text: string | undefined) => {
  if (!text) return "";
  return text.replace(/\\n/g, "\n");
};
