"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { Notice } from "@/components/notice";
import { Button, Card, Field, inputClass, textareaClass } from "@/components/ui";

type StudentEditable = {
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
};

async function readApiJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, error: text || "接口没有返回有效 JSON" };
  }
}

export function StudentDetailActions({ student, readOnly = false }: { student: StudentEditable; readOnly?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await readApiJson(response);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || "保存失败");
      return;
    }
    setMessage("学生档案已保存");
    router.refresh();
  }

  async function disableStudent() {
    const confirmed = window.confirm(`确认停用学生「${student.name}」吗？历史错题、计划和日报会保留。`);
    if (!confirmed) return;
    setMessage("");
    setError("");
    setDeleting(true);
    const response = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
    const result = await readApiJson(response);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error || "停用失败");
      return;
    }
    router.push("/students");
    router.refresh();
  }

  return (
    <Card title={readOnly ? "学生档案" : "编辑学生档案"}>
      {readOnly ? (
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-slate-500">学生姓名</dt>
            <dd className="mt-1 font-medium text-slate-950">{student.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">年级</dt>
            <dd className="mt-1 font-medium text-slate-950">{student.grade}</dd>
          </div>
          <div>
            <dt className="text-slate-500">主要科目</dt>
            <dd className="mt-1 text-slate-900">{student.mainSubjects || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">薄弱科目</dt>
            <dd className="mt-1 text-slate-900">{student.weakSubjects || "-"}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-slate-500">学习目标</dt>
            <dd className="mt-1 text-slate-900">{student.goal || "-"}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-slate-500">薄弱知识点</dt>
            <dd className="mt-1 text-slate-900">{student.weakPoints || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">家长称呼</dt>
            <dd className="mt-1 text-slate-900">{student.parentName || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">家长联系方式</dt>
            <dd className="mt-1 text-slate-900">{student.parentContact || "-"}</dd>
          </div>
        </dl>
      ) : (
      <form className="grid gap-3" onSubmit={save}>
        <Notice message={message} type="success" />
        <Notice message={error} type="error" />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="学生姓名">
            <input className={inputClass} name="name" required defaultValue={student.name} />
          </Field>
          <Field label="年级">
            <input className={inputClass} name="grade" required defaultValue={student.grade} />
          </Field>
          <Field label="主要科目">
            <input className={inputClass} name="mainSubjects" defaultValue={student.mainSubjects} />
          </Field>
          <Field label="薄弱科目">
            <input className={inputClass} name="weakSubjects" defaultValue={student.weakSubjects} />
          </Field>
          <Field label="家长称呼">
            <input className={inputClass} name="parentName" defaultValue={student.parentName || ""} />
          </Field>
          <Field label="家长联系方式">
            <input className={inputClass} name="parentContact" defaultValue={student.parentContact || ""} />
          </Field>
        </div>
        <Field label="学习目标">
          <textarea className={textareaClass} name="goal" defaultValue={student.goal} />
        </Field>
        <Field label="薄弱知识点">
          <textarea className={textareaClass} name="weakPoints" defaultValue={student.weakPoints} />
        </Field>
        <Field label="备注">
          <textarea className={textareaClass} name="remark" defaultValue={student.remark || ""} />
        </Field>
        <div className="flex flex-wrap justify-between gap-3">
          <Button type="button" variant="danger" onClick={disableStudent} disabled={deleting}>
            <Trash2 className="h-4 w-4" />
            {deleting ? "停用中..." : "停用学生"}
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "保存中..." : "保存档案"}
          </Button>
        </div>
      </form>
      )}
    </Card>
  );
}
