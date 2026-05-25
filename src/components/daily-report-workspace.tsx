"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Copy, MessageSquareText, Save } from "lucide-react";
import { Notice } from "@/components/notice";
import { Button, Card, Empty, Field, inputClass, textareaClass } from "@/components/ui";
import { copyText } from "@/lib/client-clipboard";
import { formatDate } from "@/lib/format";

type StudentOption = { id: string; name: string; grade: string; parentName?: string | null };
type WrongQuestionOption = {
  id: string;
  subject: string;
  knowledgePoint?: string | null;
  reviewSuggestion?: string | null;
  createdAt: string;
  student: { id: string; name: string };
};
type DailyReport = {
  id: string;
  studyDuration: string;
  studyContent: string;
  completionStatus: string;
  studyStatus: string;
  content: string;
  copiedCount: number;
  createdAt: string;
  student: { name: string; grade: string; parentName?: string | null };
};

async function readApiJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, error: text || "接口没有返回有效 JSON" };
  }
}

export function DailyReportWorkspace({
  students,
  reports,
  wrongQuestions,
  defaultSelectedStudentId,
}: {
  students: StudentOption[];
  reports: DailyReport[];
  wrongQuestions: WrongQuestionOption[];
  defaultSelectedStudentId?: string;
}) {
  const router = useRouter();
  const [latest, setLatest] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(() =>
    defaultSelectedStudentId && students.some((student) => student.id === defaultSelectedStudentId) ? defaultSelectedStudentId : "",
  );
  const [selectedWrongQuestionIds, setSelectedWrongQuestionIds] = useState<string[]>([]);

  const studentWrongQuestions = useMemo(
    () => wrongQuestions.filter((item) => !selectedStudentId || item.student.id === selectedStudentId),
    [selectedStudentId, wrongQuestions],
  );

  function toggleWrongQuestion(id: string) {
    setSelectedWrongQuestionIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    let result: { ok?: boolean; error?: string; data?: DailyReport } = {};
    try {
      const response = await fetch("/api/daily-reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(form.entries()),
          wrongQuestionIds: selectedWrongQuestionIds,
        }),
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
    setMessage("家长日报已生成并保存");
    router.refresh();
  }

  async function saveReport(report: DailyReport, content: string) {
    setMessage("");
    setError("");
    let result: { ok?: boolean; error?: string; data?: DailyReport } = {};
    try {
      const response = await fetch(`/api/daily-reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      result = await readApiJson(response);
    } catch {
      result = { ok: false, error: "网络异常，请稍后重试" };
    }
    if (!result.ok || !result.data) {
      setError(result.error || "家长日报保存失败");
      return;
    }
    setLatest(result.data);
    setMessage("家长日报已保存");
    router.refresh();
  }

  async function copyReport(report: DailyReport) {
    try {
      await copyText(report.content);
    } catch {
      setError("复制失败，请手动选择日报内容复制");
      return;
    }
    let result: { ok?: boolean; error?: string } = {};
    try {
      const response = await fetch(`/api/daily-reports/${report.id}/copy`, { method: "POST" });
      result = await readApiJson(response);
    } catch {
      result = { ok: false, error: "网络异常，请稍后重试" };
    }
    if (!result.ok) {
      setError(result.error || "复制次数记录失败");
      return;
    }
    setMessage("日报已复制，可直接粘贴到微信");
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
      <Card title="生成家长日报">
        <form className="grid gap-3" onSubmit={generate}>
          <Notice message={message} type="success" />
          <Notice message={error} type="error" />
          <Field label="学生">
            <select
              className={inputClass}
              name="studentId"
              required
              value={selectedStudentId}
              onChange={(event) => {
                setSelectedStudentId(event.target.value);
                setSelectedWrongQuestionIds([]);
              }}
            >
              <option value="">请选择学生</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.parentName || "家长"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="学习时长">
            <input className={inputClass} name="studyDuration" defaultValue="2小时" required />
          </Field>
          <Field label="今日学习内容">
            <textarea className={textareaClass} name="studyContent" placeholder="数学一次函数练习、物理受力分析、化学方程式配平、学术英语阅读证据定位" required />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="任务完成情况">
              <select className={inputClass} name="completionStatus" defaultValue="基本完成">
                <option>全部完成</option>
                <option>基本完成</option>
                <option>部分完成</option>
                <option>未完成</option>
              </select>
            </Field>
            <Field label="今日状态">
              <select className={inputClass} name="studyStatus" defaultValue="比较专注">
                <option>专注</option>
                <option>比较专注</option>
                <option>一般</option>
                <option>易分心</option>
              </select>
            </Field>
          </div>
          <Field label="关联今日错题">
            <div className="max-h-56 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2">
              {!selectedStudentId ? (
                <div className="p-3 text-sm text-slate-500">先选择学生，再勾选要写进日报的错题。</div>
              ) : studentWrongQuestions.length === 0 ? (
                <div className="p-3 text-sm text-slate-500">该学生暂无待巩固错题，会自动按学习内容生成日报。</div>
              ) : (
                <div className="grid gap-2">
                  {studentWrongQuestions.map((item) => (
                    <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-md bg-white p-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedWrongQuestionIds.includes(item.id)}
                        onChange={() => toggleWrongQuestion(item.id)}
                      />
                      <span>
                        <span className="font-medium text-slate-900">
                          {item.subject} · {item.knowledgePoint || "未标注知识点"}
                        </span>
                        <span className="block text-xs text-slate-500">{item.reviewSuggestion || formatDate(item.createdAt)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field label="督学备注">
            <textarea className={textareaClass} name="staffNote" placeholder="例如：审题速度有提升，但函数建模还需巩固" />
          </Field>
          <Button type="submit" disabled={loading || students.length === 0}>
            <MessageSquareText className="h-4 w-4" />
            {loading ? "生成中..." : "生成家长日报"}
          </Button>
        </form>
      </Card>

      <div className="grid gap-6">
        <Card title="最新日报">
          {!latest ? <Empty>生成后可编辑并直接复制到微信。</Empty> : <ReportCard report={latest} onCopy={copyReport} onSave={saveReport} />}
        </Card>
        <Card title="历史日报">
          {reports.length === 0 ? (
            <Empty>暂无家长日报</Empty>
          ) : (
            <div className="grid gap-3">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} onCopy={copyReport} onSave={saveReport} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ReportCard({
  report,
  onCopy,
  onSave,
}: {
  report: DailyReport;
  onCopy: (report: DailyReport) => void;
  onSave: (report: DailyReport, content: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(report.content);
  const [saving, setSaving] = useState(false);
  const reportForCopy = { ...report, content: draft };

  async function save() {
    setSaving(true);
    await onSave(report, draft);
    setSaving(false);
  }

  return (
    <article className="rounded-md border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-950">{report.student?.name} · 家长日报</div>
          <div className="mt-1 text-xs text-slate-500">
            {formatDate(report.createdAt)} · 已复制 {report.copiedCount} 次
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={save} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "保存中" : "保存"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onCopy(reportForCopy)}>
            <Copy className="h-4 w-4" />
            一键复制
          </Button>
        </div>
      </div>
      <textarea
        className="mt-3 min-h-52 w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-7 text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </article>
  );
}
