"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, RefreshCw, Save } from "lucide-react";
import { Notice } from "@/components/notice";
import { Button, Card, Field, inputClass, textareaClass } from "@/components/ui";
import { copyText } from "@/lib/client-clipboard";
import { formatDate } from "@/lib/format";

type WrongQuestionDetail = {
  id: string;
  subject: string;
  imageUrl?: string | null;
  studentReason?: string | null;
  ocrText?: string | null;
  knowledgePoint?: string | null;
  questionType?: string | null;
  difficulty?: string | null;
  aiAnalysis: string;
  hintLevel1?: string | null;
  hintLevel2?: string | null;
  fullExplanation?: string | null;
  reviewSuggestion?: string | null;
  nextReviewDate?: string | null;
  masteryStatus: string;
  createdAt: string;
  student: { id: string; name: string; grade: string; weakPoints?: string | null };
};

async function readApiJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, error: text || "接口没有返回有效 JSON" };
  }
}

function buildCopyText(item: WrongQuestionDetail) {
  return [
    `${item.student.name}错题分析`,
    `科目：${item.subject}`,
    `知识点：${item.knowledgePoint || "未标注"}`,
    `题型：${item.questionType || "未标注"}`,
    `难度：${item.difficulty || "未标注"}`,
    "",
    `分析：${item.aiAnalysis}`,
    "",
    `第一层提示：${item.hintLevel1 || "-"}`,
    `第二层思路：${item.hintLevel2 || "-"}`,
    "",
    `完整解析：${item.fullExplanation || "-"}`,
    "",
    `复习建议：${item.reviewSuggestion || "-"}`,
  ].join("\n");
}

export function WrongQuestionDetailEditor({ record }: { record: WrongQuestionDetail }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    let result: { ok?: boolean; error?: string } = {};
    try {
      const response = await fetch(`/api/wrong-questions/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      result = await readApiJson(response);
    } catch {
      result = { ok: false, error: "网络异常，请稍后重试" };
    } finally {
      setSaving(false);
    }
    if (!result.ok) {
      setError(result.error || "保存失败");
      return;
    }
    setMessage("错题分析已保存");
    router.refresh();
  }

  async function copy() {
    try {
      await copyText(buildCopyText(record));
    } catch {
      setError("复制失败，请手动选择错题分析内容复制");
      return;
    }
    setMessage("错题分析已复制");
  }

  async function reanalyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setReanalyzing(true);
    const form = new FormData(event.currentTarget);
    let result: { ok?: boolean; error?: string } = {};
    try {
      const response = await fetch(`/api/wrong-questions/${record.id}/reanalyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraNote: form.get("extraNote") }),
      });
      result = await readApiJson(response);
    } catch {
      result = { ok: false, error: "网络异常，请稍后重试" };
    } finally {
      setReanalyzing(false);
    }
    if (!result.ok) {
      setError(result.error || "重新分析失败");
      return;
    }
    setMessage("AI已重新分析并覆盖当前错题记录");
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <div className="grid gap-6">
        <Card title="错题图片">
          {record.imageUrl ? (
            <Image
              src={record.imageUrl}
              alt="错题图片"
              width={900}
              height={600}
              unoptimized
              className="max-h-[520px] w-full rounded-md border border-slate-200 object-contain"
            />
          ) : (
            <div className="rounded-md border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">暂无图片</div>
          )}
        </Card>
        <Card title="学生信息">
          <div className="text-sm leading-7 text-slate-700">
            <div className="font-medium text-slate-950">
              {record.student.name} · {record.student.grade}
            </div>
            <div>薄弱点：{record.student.weakPoints || "-"}</div>
            <div>学生自述：{record.studentReason || "-"}</div>
            <div>创建时间：{formatDate(record.createdAt)}</div>
            <Link href={`/students/${record.student.id}`} className="text-emerald-700 hover:text-emerald-900">
              查看学生档案
            </Link>
          </div>
        </Card>
        <Card title="重新AI分析">
          <form className="grid gap-3" onSubmit={reanalyze}>
            <p className="text-sm leading-6 text-slate-600">
              适合图片识别不准、解析不够细或督学补充了新要求时使用。重新分析会扣减一次错题分析额度，并覆盖右侧AI分析内容。
            </p>
            <Field label="重新分析要求">
              <textarea
                className={textareaClass}
                name="extraNote"
                placeholder="例如：重点检查第二问；英语题请使用正式学术英语；物理题补充单位分析"
              />
            </Field>
            <Button type="submit" variant="secondary" disabled={reanalyzing}>
              <RefreshCw className="h-4 w-4" />
              {reanalyzing ? "重新分析中..." : "重新AI分析"}
            </Button>
          </form>
        </Card>
      </div>

      <Card title="编辑错题分析">
        <form className="grid gap-3" onSubmit={save}>
          <Notice message={message} type="success" />
          <Notice message={error} type="error" />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="科目">
              <input className={inputClass} name="subject" defaultValue={record.subject} required />
            </Field>
            <Field label="掌握状态">
              <select className={inputClass} name="masteryStatus" defaultValue={record.masteryStatus}>
                <option value="not_mastered">未掌握</option>
                <option value="reviewing">复习中</option>
                <option value="mastered">已掌握</option>
                <option value="focus">重点关注</option>
              </select>
            </Field>
            <Field label="知识点">
              <input className={inputClass} name="knowledgePoint" defaultValue={record.knowledgePoint || ""} />
            </Field>
            <Field label="题型">
              <input className={inputClass} name="questionType" defaultValue={record.questionType || ""} />
            </Field>
            <Field label="难度">
              <input className={inputClass} name="difficulty" defaultValue={record.difficulty || ""} />
            </Field>
            <Field label="下次复习日期">
              <input className={inputClass} name="nextReviewDate" type="date" defaultValue={record.nextReviewDate ? record.nextReviewDate.slice(0, 10) : ""} />
            </Field>
          </div>
          <Field label="OCR / 题目识别">
            <textarea className={textareaClass} name="ocrText" defaultValue={record.ocrText || ""} />
          </Field>
          <Field label="错题分析">
            <textarea className={textareaClass} name="aiAnalysis" defaultValue={record.aiAnalysis} required />
          </Field>
          <Field label="第一层提示">
            <textarea className={textareaClass} name="hintLevel1" defaultValue={record.hintLevel1 || ""} />
          </Field>
          <Field label="第二层思路">
            <textarea className={textareaClass} name="hintLevel2" defaultValue={record.hintLevel2 || ""} />
          </Field>
          <Field label="完整解析">
            <textarea className={`${textareaClass} min-h-36`} name="fullExplanation" defaultValue={record.fullExplanation || ""} />
          </Field>
          <Field label="复习建议">
            <textarea className={textareaClass} name="reviewSuggestion" defaultValue={record.reviewSuggestion || ""} />
          </Field>
          <div className="flex flex-wrap justify-between gap-3">
            <Button type="button" variant="secondary" onClick={copy}>
              <Copy className="h-4 w-4" />
              复制分析
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "保存中..." : "保存错题"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
