import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-20">
      <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-medium text-slate-500">404</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">页面不存在或无权访问</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          请确认登录账号角色是否正确。平台后台仅平台管理员可访问，员工账号只能使用门店工作台。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800"
          >
            返回工作台
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            重新登录
          </Link>
        </div>
      </div>
    </main>
  );
}
