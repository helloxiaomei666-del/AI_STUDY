"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { copyText } from "@/lib/client-clipboard";

export function CopyStudentPortalLink({ path }: { path: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copyLink() {
    const url = new URL(path, window.location.origin).toString();
    setStatus("copied");
    try {
      await copyText(url);
    } catch {
      setStatus("failed");
      return;
    }
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <div className="mt-3 grid gap-1">
      <Button type="button" variant="secondary" onClick={copyLink}>
        {status === "copied" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {status === "copied" ? "已复制链接" : "复制学生端链接"}
      </Button>
      {status === "failed" && <span className="text-xs text-rose-600">复制失败，请手动复制下方链接</span>}
    </div>
  );
}
