import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { ROLE_COLORS, type Role } from "../lib/types";

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wider",
        ROLE_COLORS[role],
        className
      )}
    >
      {role}
    </span>
  );
}

export function OverseasBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-fuchsia-500/30 bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-fuchsia-300",
        className
      )}
    >
      ✈ OS
    </span>
  );
}

export function ratingTone(rating: number) {
  if (rating >= 90) return "from-amber-300 to-yellow-500 text-slate-900";
  if (rating >= 80) return "from-emerald-300 to-emerald-500 text-slate-900";
  if (rating >= 70) return "from-sky-300 to-sky-500 text-slate-900";
  if (rating >= 60) return "from-slate-300 to-slate-400 text-slate-900";
  return "from-slate-500 to-slate-600 text-white";
}

export function RatingBadge({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "lg";
}) {
  return (
    <span
      title="AI Rating"
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-to-br font-black shadow",
        ratingTone(rating),
        size === "lg" ? "h-16 w-16 text-2xl ring-4 ring-white/10" : "h-6 w-6 text-[10px]"
      )}
    >
      {rating}
    </span>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur", className)}>
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "success" | "outline";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
  title?: string;
}) {
  const styles = {
    primary: "bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:brightness-110",
    success: "bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:brightness-110",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
    ghost: "bg-slate-800 text-slate-200 hover:bg-slate-700",
    outline: "border border-slate-700 text-slate-300 hover:bg-slate-800",
  }[variant];
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100",
        styles,
        className
      )}
    >
      {children}
    </button>
  );
}
