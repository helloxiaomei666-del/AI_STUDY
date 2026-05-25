"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-20">
      <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-medium text-rose-700">系统异常</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">当前页面暂时无法打开</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          请先重试一次。如果仍然失败，平台管理员可以在后台查看最近 AI 失败记录和服务端日志。
        </p>
        {error.digest && <p className="mt-3 text-xs text-slate-400">错误编号：{error.digest}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800"
          >
            重新加载
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            返回工作台
          </Link>
        </div>
      </div>
    </main>
  );
}
