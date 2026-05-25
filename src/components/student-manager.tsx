"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Save, Search } from "lucide-react";
import { Notice } from "@/components/notice";
import { Button, Card, Empty, Field, inputClass, textareaClass } from "@/components/ui";
import { formatDate } from "@/lib/format";

type Student = {
  id: string;
  name: string;
  grade: string;
  mainSubjects: string;
  goal: string;
  weakSubjects: string;
  weakPoints: string;
  parentName?: string | null;
  parentContact?: string | null;
  remark?: string | null;
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

export function StudentManager({ students, readOnly = false }: { students: Student[]; readOnly?: boolean }) {
  const router = useRouter();
  const [studentRows, setStudentRows] = useState(students);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState(false);
  const filtered = studentRows.filter((student) => {
    const text = `${student.name}${student.grade}${student.weakPoints}${student.parentName}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  async function createStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    const formElement = event.currentTarget;
    setMessage("");
    setError("");
    setCreating(true);
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());
    let result: { ok?: boolean; error?: string; data?: Student } = {};
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      result = await readApiJson(response);
    } catch {
      result = { ok: false, error: "网络异常，请稍后重试" };
    } finally {
      setCreating(false);
    }
    if (!result.ok) {
      setError(result.error || "新增失败");
      return;
    }
    if (result.data) {
      setStudentRows((current) => [result.data as Student, ...current.filter((item) => item.id !== result.data?.id)]);
    }
    setMessage("学生已新增");
    formElement.reset();
    setJustCreated(true);
    window.setTimeout(() => setJustCreated(false), 1800);
    router.refresh();
  }

  return (
    <div className={readOnly ? "grid gap-6" : "grid gap-6 xl:grid-cols-[360px_1fr]"}>
      {!readOnly && (
        <Card title="新增学生">
          <form className="grid gap-3" onSubmit={createStudent}>
            <Notice message={message} type="success" />
            <Notice message={error} type="error" />
            <Field label="学生姓名">
              <input className={inputClass} name="name" required placeholder="例如：小明" />
            </Field>
            <Field label="年级">
              <input className={inputClass} name="grade" required placeholder="例如：初二" />
            </Field>
            <Field label="主要科目">
              <input className={inputClass} name="mainSubjects" placeholder="数学、物理、化学、学术英语" />
            </Field>
            <Field label="学习目标">
              <textarea className={textareaClass} name="goal" placeholder="提分、补弱、中考、高考等" />
            </Field>
            <Field label="薄弱科目">
              <input className={inputClass} name="weakSubjects" placeholder="数学、物理、化学、英语" />
            </Field>
            <Field label="薄弱知识点">
              <textarea className={textareaClass} name="weakPoints" placeholder="一次函数、几何证明、受力分析、学术英语句法" />
            </Field>
            <Field label="家长称呼">
              <input className={inputClass} name="parentName" placeholder="小明妈妈" />
            </Field>
            <Field label="家长联系方式">
              <input className={inputClass} name="parentContact" placeholder="手机号或微信备注" />
            </Field>
            <Field label="备注">
              <textarea className={textareaClass} name="remark" />
            </Field>
            <Button type="submit" disabled={creating || justCreated}>
              <Plus className="h-4 w-4" />
              {creating ? "新增中..." : justCreated ? "已新增" : "新增学生"}
            </Button>
          </form>
        </Card>
      )}

      <Card
        title={readOnly ? "学生概览" : "学生列表"}
        action={
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`${inputClass} w-64 pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索学生" />
          </label>
        }
      >
        {filtered.length === 0 ? (
          <Empty>暂无学生</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-100">
                  <th className="py-3 font-medium">学生</th>
                  <th className="py-3 font-medium">科目/目标</th>
                  <th className="py-3 font-medium">薄弱点</th>
                  <th className="py-3 font-medium">家长</th>
                  <th className="py-3 font-medium">创建时间</th>
                  <th className="py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr key={student.id} className="border-b border-slate-100 align-top">
                    <td className="py-3">
                      <div className="font-medium text-slate-950">{student.name}</div>
                      <div className="text-slate-500">{student.grade}</div>
                    </td>
                    <td className="py-3">
                      <div>{student.mainSubjects || "-"}</div>
                      <div className="max-w-xs truncate text-slate-500">{student.goal || "-"}</div>
                    </td>
                    <td className="py-3">
                      <div>{student.weakSubjects || "-"}</div>
                      <div className="max-w-xs truncate text-slate-500">{student.weakPoints || "-"}</div>
                    </td>
                    <td className="py-3">
                      <div>{student.parentName || "-"}</div>
                      <div className="text-slate-500">{student.parentContact || ""}</div>
                    </td>
                    <td className="py-3 text-slate-500">{formatDate(student.createdAt)}</td>
                    <td className="py-3">
                      <Link className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900" href={`/students/${student.id}`}>
                        <Save className="h-4 w-4" />
                        详情
                      </Link>
                    </td>
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
