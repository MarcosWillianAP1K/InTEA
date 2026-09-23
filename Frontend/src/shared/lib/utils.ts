import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines conditional class names using `clsx` and resolves Tailwind CSS class conflicts using `twMerge`.
 *
 * @param inputs - List of class values, objects, or expressions to merge.
 * @returns Deduplicated and merged CSS class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}