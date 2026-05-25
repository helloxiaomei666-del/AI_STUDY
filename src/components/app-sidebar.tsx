"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenCheck,
  ClipboardList,
  Gauge,
  IdCard,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  NotebookPen,
  Settings,
  Users,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/format";

const baseNavItems = [
  { href: "/dashboard", label: "工作台", icon: LayoutDashboard },
  { href: "/workflow", label: "督学", icon: NotebookPen },
  { href: "/students", label: "学生", icon: Users },
  { href: "/wrong-questions", label: "错题", icon: BookOpenCheck },
  { href: "/study-plans", label: "计划", icon: ClipboardList },
  { href: "/daily-reports", label: "日报", icon: MessageSquareText },
  { href: "/quotas", label: "额度", icon: Gauge },
];

const ownerNavItems = [
  { href: "/dashboard", label: "经营", icon: LayoutDashboard },
  { href: "/students", label: "学生概览", icon: Users },
  { href: "/staff", label: "员工", icon: IdCard },
  { href: "/daily-reports", label: "反馈记录", icon: MessageSquareText },
  { href: "/quotas", label: "额度", icon: Gauge },
];

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const scopedItems = user.role === "staff" ? baseNavItems : ownerNavItems;
  const allItems = user.role === "platform_admin" ? [{ href: "/admin", label: "平台", icon: Settings }] : scopedItems;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-full flex-col border-b border-slate-200 bg-white px-4 py-3 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <div className="flex items-center justify-between gap-3 lg:block">
        <Link href="/dashboard" className="block">
          <div className="text-lg font-semibold text-slate-950">智习管家</div>
          <div className="text-xs text-slate-500">AI自习室督学系统</div>
        </Link>
        <button
          type="button"
          onClick={logout}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
          title="退出登录"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <nav className="mt-4 flex gap-2 overflow-x-auto lg:mt-8 lg:flex-col lg:overflow-visible">
        {allItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium",
                active ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-slate-100 pt-4 lg:block">
        <div className="text-sm font-medium text-slate-950">{user.name}</div>
        <div className="text-xs text-slate-500">{user.role}</div>
        <button
          type="button"
          onClick={logout}
          className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
    </aside>
  );
}
