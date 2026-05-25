"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { Notice } from "@/components/notice";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: form.get("account"),
          password: form.get("password"),
        }),
      });

      const text = await response.text();
      let result: { ok?: boolean; error?: string } = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = { ok: false, error: text || "登录接口没有返回有效 JSON" };
      }

      if (!result.ok) {
        setMessage(result.error || "登录失败");
        return;
      }
      const nextPath = new URLSearchParams(window.location.search).get("next") || "/dashboard";
      router.push(nextPath.startsWith("/") ? nextPath : "/dashboard");
      router.refresh();
    } catch {
      setMessage("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-4" method="post" action="/api/auth/login" onSubmit={onSubmit}>
      <Notice message={message} type="error" />
      <Field label="手机号或邮箱">
        <input className={inputClass} name="account" placeholder="请输入账号" required />
      </Field>
      <Field label="密码">
        <input className={inputClass} name="password" placeholder="请输入密码" type="password" required />
      </Field>
      <Button type="submit" disabled={loading} className="w-full">
        <LogIn className="h-4 w-4" />
        {loading ? "登录中..." : "登录"}
      </Button>
    </form>
  );
}
