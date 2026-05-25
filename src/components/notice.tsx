"use client";

export function Notice({ message, type = "info" }: { message?: string; type?: "info" | "error" | "success" }) {
  if (!message) return null;
  const className =
    type === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : type === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-slate-200 bg-slate-50 text-slate-700";
  return <div className={`rounded-md border px-3 py-2 text-sm ${className}`}>{message}</div>;
}
