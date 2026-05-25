"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Notice } from "@/components/notice";
import { Button, Card, Empty, Field, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/format";

type StaffUser = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  role: string;
  createdAt: string;
};

async function readApiJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, error: text || "接口没有返回有效 JSON" };
  }
}

export function StaffManager({ users }: { users: StaffUser[] }) {
  const router = useRouter();
  const [staffUsers, setStaffUsers] = useState(users);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState(false);

  async function createStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    const formElement = event.currentTarget;
    setMessage("");
    setError("");
    setCreating(true);
    let result: { ok?: boolean; error?: string; data?: StaffUser } = {};
    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(formElement))),
      });
      result = await readApiJson(response);
    } catch {
      result = { ok: false, error: "网络异常，请稍后重试" };
    } finally {
      setCreating(false);
    }
    if (!result.ok) {
      const duplicate = result.error?.includes("已被使用");
      setError(duplicate ? "该手机号或邮箱已存在，可让员工直接用原账号登录，或更换手机号/邮箱。" : result.error || "创建失败");
      return;
    }
    if (result.data) {
      setStaffUsers((current) => [result.data as StaffUser, ...current.filter((item) => item.id !== result.data?.id)]);
    }
    setMessage("员工账号已创建");
    formElement.reset();
    setJustCreated(true);
    window.setTimeout(() => setJustCreated(false), 1800);
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <Card title="创建员工账号">
        <form className="grid gap-3" onSubmit={createStaff}>
          <Notice message={message} type="success" />
          <Notice message={error} type="error" />
          <Field label="姓名">
            <input className={inputClass} name="name" required />
          </Field>
          <Field label="手机号">
            <input className={inputClass} name="phone" required />
          </Field>
          <Field label="邮箱">
            <input className={inputClass} name="email" type="email" />
          </Field>
          <Field label="初始密码">
            <input className={inputClass} name="password" defaultValue="123456" />
          </Field>
          <input type="hidden" name="role" value="staff" />
          <Button type="submit" disabled={creating || justCreated}>
            <UserPlus className="h-4 w-4" />
            {creating ? "创建中..." : justCreated ? "已创建" : "创建员工"}
          </Button>
        </form>
      </Card>

      <Card title="员工列表">
        {staffUsers.length === 0 ? (
          <Empty>暂无员工</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-100">
                  <th className="py-3 font-medium">姓名</th>
                  <th className="py-3 font-medium">手机号</th>
                  <th className="py-3 font-medium">邮箱</th>
                  <th className="py-3 font-medium">角色</th>
                  <th className="py-3 font-medium">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {staffUsers.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-950">{item.name}</td>
                    <td className="py-3">{item.phone || "-"}</td>
                    <td className="py-3">{item.email || "-"}</td>
                    <td className="py-3">{item.role}</td>
                    <td className="py-3 text-slate-500">{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
