import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cm(...args: ClassValue[]) {
  return twMerge(clsx(args));
}
