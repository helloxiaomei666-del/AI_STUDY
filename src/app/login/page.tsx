import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-950">智习管家</h1>
          <p className="mt-2 text-sm text-slate-500">登录 AI 自习室错题诊断与学习反馈系统</p>
        </div>
        <LoginForm />
        <div className="mt-5 rounded-md bg-slate-50 p-3 text-xs leading-6 text-slate-500">
          演示账号：18800000000 / 123456（平台）
          <br />
          18800000001 / 123456（老板），18800000002 / 123456（督学）
        </div>
      </div>
    </main>
  );
}
