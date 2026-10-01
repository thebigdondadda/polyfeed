import { type ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function Button({ selected = false, className = "", ...props }: ButtonProps) {
  const tone = selected
    ? "bg-white text-bg-primary ring ring-white hover:bg-white/90"
    : "bg-bg-secondary text-white ring ring-bg-tertiary hover:bg-bg-secondary/80";

  return (
    <button
      className={`inline-flex h-5 w-26 shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap px-2 rounded-lg text-xs font-bold ${tone} ${className}`}
      {...props}
    />
  );
}
