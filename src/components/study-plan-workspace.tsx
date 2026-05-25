"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipboardList, Copy, Save } from "lucide-react";
import { Notice } from "@/components/notice";
import { Button, Card, Empty, Field, inputClass } from "@/components/ui";
import { copyText } from "@/lib/client-clipboard";
import { formatDate } from "@/lib/format";

type StudentOption = { id: string; name: string; grade: string; weakSubjects: string; weakPoints: string };
type StudyPlan = {
  id: string;
  planType: string;
  availableMinutes: number;
  focusSubject?: string | null;
  content: string;
  createdAt: string;
  student: { name: string; grade: string };
};

async function readApiJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, error: text || "接口没有返回有效 JSON" };
  }
}

export function StudyPlanWorkspace({ students, plans }: { students: StudentOption[]; plans: StudyPlan[] }) {
  const router = useRouter();
  const [latest, setLatest] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    let result: { ok?: boolean; error?: string; data?: StudyPlan } = {};
    try {
      const response = await fetch("/api/study-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      result = await readApiJson(response);
    } catch {
      result = { ok: false, error: "网络异常，请稍后重试" };
    } finally {
      setLoading(false);
    }
    if (!result.ok || !result.data) {
      setError(result.error || "生成失败");
      return;
    }
    setLatest(result.data);
    setMessage("学习计划已生成并保存");
    router.refresh();
  }

  async function savePlan(plan: StudyPlan, content: string) {
    setMessage("");
    setError("");
    let result: { ok?: boolean; error?: string; data?: StudyPlan } = {};
    try {
      const response = await fetch(`/api/study-plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      result = await readApiJson(response);
    } catch {
      result = { ok: false, error: "网络异常，请稍后重试" };
    }
    if (!result.ok || !result.data) {
      setError(result.error || "学习计划保存失败");
      return;
    }
    setLatest(result.data);
    setMessage("学习计划已保存");
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <Card title="生成学习计划">
        <form className="grid gap-3" onSubmit={generate}>
          <Notice message={message} type="success" />
          <Notice message={error} type="error" />
          <Field label="学生">
            <select className={inputClass} name="studentId" required>
              <option value="">请选择学生</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.grade}
                </option>
              ))}
            </select>
          </Field>
          <Field label="计划类型">
            <select className={inputClass} name="planType" defaultValue="today">
              <option value="today">今日计划</option>
              <option value="weekly">本周计划</option>
            </select>
          </Field>
          <Field label="可学习时间（分钟）">
            <input className={inputClass} name="availableMinutes" type="number" min="20" max="1440" defaultValue="120" required />
          </Field>
          <Field label="本次学习重点">
            <input className={inputClass} name="focusSubject" placeholder="例如：一次函数、受力分析、化学方程式、学术英语句法" />
          </Field>
          <Button type="submit" disabled={loading || students.length === 0}>
            <ClipboardList className="h-4 w-4" />
            {loading ? "生成中..." : "生成学习计划"}
          </Button>
        </form>
      </Card>

      <div className="grid gap-6">
        <Card title="最新计划">
          {!latest ? (
            <Empty>生成后会显示在这里。</Empty>
          ) : (
            <PlanCard plan={latest} onSave={savePlan} onCopySuccess={() => setMessage("学习计划已复制")} onCopyError={() => setError("复制失败，请手动选择内容复制")} />
          )}
        </Card>
        <Card title="历史计划">
          {plans.length === 0 ? (
            <Empty>暂无学习计划</Empty>
          ) : (
            <div className="grid gap-3">
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} onSave={savePlan} onCopySuccess={() => setMessage("学习计划已复制")} onCopyError={() => setError("复制失败，请手动选择内容复制")} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  onSave,
  onCopySuccess,
  onCopyError,
}: {
  plan: StudyPlan;
  onSave: (plan: StudyPlan, content: string) => Promise<void>;
  onCopySuccess: () => void;
  onCopyError: () => void;
}) {
  const [draft, setDraft] = useState(plan.content);
  const [saving, setSaving] = useState(false);

  async function copy() {
    try {
      await copyText(draft);
      onCopySuccess();
    } catch {
      onCopyError();
    }
  }

  async function save() {
    setSaving(true);
    await onSave(plan, draft);
    setSaving(false);
  }

  return (
    <article className="rounded-md border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-950">
            {plan.student?.name} · {plan.planType === "today" ? "今日计划" : "本周计划"}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {formatDate(plan.createdAt)} · {plan.availableMinutes}分钟 · {plan.focusSubject || "综合复习"}
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={copy}>
          <Copy className="h-4 w-4" />
          复制
        </Button>
        <Button type="button" variant="secondary" onClick={save} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "保存中" : "保存"}
        </Button>
      </div>
      <textarea
        className="mt-3 min-h-56 w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-7 text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </article>
  );
}
