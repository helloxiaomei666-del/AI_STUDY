"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Clipboard, Copy, Filter, Sparkles } from "lucide-react";
import { Notice } from "@/components/notice";
import { Button, Card, Empty, Field, inputClass, textareaClass } from "@/components/ui";
import { copyText } from "@/lib/client-clipboard";
import { formatDate } from "@/lib/format";
import { scienceSubjects } from "@/lib/subjects";

type StudentOption = { id: string; name: string; grade: string; weakPoints: string };
type WrongQuestion = {
  id: string;
  subject: string;
  knowledgePoint?: string | null;
  questionType?: string | null;
  difficulty?: string | null;
  aiAnalysis: string;
  hintLevel1?: string | null;
  hintLevel2?: string | null;
  fullExplanation?: string | null;
  reviewSuggestion?: string | null;
  masteryStatus: string;
  createdAt: string;
  student: { id?: string; name: string; grade: string };
};

const masteryLabels: Record<string, string> = {
  not_mastered: "未掌握",
  reviewing: "复习中",
  mastered: "已掌握",
  focus: "重点关注",
};

async function readApiJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, error: text || "接口没有返回有效 JSON" };
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

async function compressImageFile(file: File) {
  if (file.type === "image/gif") return readFileAsDataUrl(file);

  const source = await readFileAsDataUrl(file);
  const image = document.createElement("img");
  image.decoding = "async";
  image.src = source;
  await image.decode();

  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function buildAnalysisText(item: WrongQuestion) {
  return [
    `${item.student?.name || "学生"}错题分析`,
    `科目：${item.subject}`,
    `知识点：${item.knowledgePoint || "未标注"}`,
    `题型：${item.questionType || "未标注"}`,
    `难度：${item.difficulty || "未标注"}`,
    "",
    `错题分析：${item.aiAnalysis}`,
    "",
    `第一层提示：${item.hintLevel1 || "-"}`,
    `第二层思路：${item.hintLevel2 || "-"}`,
    "",
    `完整解析：${item.fullExplanation || "-"}`,
    "",
    `复习建议：${item.reviewSuggestion || "-"}`,
  ].join("\n");
}

export function WrongQuestionWorkspace({
  students,
  wrongQuestions,
}: {
  students: StudentOption[];
  wrongQuestions: WrongQuestion[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [latest, setLatest] = useState<WrongQuestion | null>(null);
  const [studentFilter, setStudentFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [masteryFilter, setMasteryFilter] = useState("");
  const [keyword, setKeyword] = useState("");

  const subjects = useMemo(
    () => Array.from(new Set(wrongQuestions.map((item) => item.subject).filter(Boolean))),
    [wrongQuestions],
  );

  const filteredWrongQuestions = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return wrongQuestions.filter((item) => {
      const matchesStudent = !studentFilter || item.student?.id === studentFilter;
      const matchesSubject = !subjectFilter || item.subject === subjectFilter;
      const matchesMastery = !masteryFilter || item.masteryStatus === masteryFilter;
      const text = `${item.student?.name || ""}${item.subject}${item.knowledgePoint || ""}${item.aiAnalysis || ""}`.toLowerCase();
      const matchesKeyword = !normalized || text.includes(normalized);
      return matchesStudent && matchesSubject && matchesMastery && matchesKeyword;
    });
  }, [keyword, masteryFilter, studentFilter, subjectFilter, wrongQuestions]);

  const weakCount = wrongQuestions.filter((item) => item.masteryStatus === "not_mastered" || item.masteryStatus === "focus").length;

  async function readFile(file?: File) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("图片不能超过 6MB");
      return;
    }
    try {
      setImageDataUrl(await compressImageFile(file));
    } catch {
      setError("图片读取或压缩失败，请换一张图片重试");
    }
  }

  async function analyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    let result: { ok?: boolean; error?: string; data?: WrongQuestion } = {};
    try {
      const response = await fetch("/api/wrong-questions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: form.get("studentId"),
          subject: form.get("subject"),
          studentReason: form.get("studentReason"),
          extraNote: form.get("extraNote"),
          imageDataUrl,
        }),
      });
      result = await readApiJson(response);
    } catch {
      result = { ok: false, error: "网络异常，请稍后重试" };
    } finally {
      setLoading(false);
    }
    if (!result.ok || !result.data) {
      setError(result.error || "分析失败");
      return;
    }
    setLatest(result.data);
    setMessage("错题分析已生成，并已保存到错题本");
    router.refresh();
  }

  async function updateMastery(id: string, masteryStatus: string) {
    let result: { ok?: boolean; error?: string } = {};
    try {
      const response = await fetch(`/api/wrong-questions/${id}/mastery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masteryStatus }),
      });
      result = await readApiJson(response);
    } catch {
      result = { ok: false, error: "网络异常，请稍后重试" };
    }
    if (!result.ok) {
      setError(result.error || "掌握状态更新失败");
      return;
    }
    setMessage("掌握状态已更新");
    router.refresh();
  }

  async function copyAnalysis(item: WrongQuestion) {
    try {
      await copyText(buildAnalysisText(item));
    } catch {
      setError("复制失败，请手动选择错题分析内容复制");
      return;
    }
    setMessage("错题分析已复制，可直接发给学生或家长");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card title="上传错题并分析">
        <form className="grid gap-3" onSubmit={analyze}>
          <Notice message={message} type="success" />
          <Notice message={error} type="error" />
          <div className="rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            当前AI能力聚焦数学、物理、化学和学术英语错题诊断。英语分析必须保持正式、严谨、学术化表达，不做口语俚语训练。AI结果仅供督学参考，建议人工检查后再发给学生或家长。
          </div>
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
          <Field label="科目">
            <select className={inputClass} name="subject" required defaultValue={scienceSubjects[0]}>
              {scienceSubjects.map((subject) => (
                <option key={subject}>{subject}</option>
              ))}
            </select>
          </Field>
          <Field label="错题图片">
            <input className={inputClass} type="file" accept="image/*" onChange={(event) => readFile(event.target.files?.[0])} />
          </Field>
          {imageDataUrl && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <Image src={imageDataUrl} alt="错题预览" width={640} height={360} unoptimized className="max-h-64 w-full object-contain" />
            </div>
          )}
          <Field label="学生自述错误原因">
            <textarea className={textareaClass} name="studentReason" placeholder="例如：没看懂条件、公式记错、单位换算错误、计算粗心" />
          </Field>
          <Field label="督学补充">
            <textarea className={textareaClass} name="extraNote" placeholder="可补充题目文字、老师观察、公式要求或实验/反应条件" />
          </Field>
          <Button type="submit" disabled={loading || students.length === 0}>
            <Sparkles className="h-4 w-4" />
            {loading ? "AI分析中..." : "开始AI分析"}
          </Button>
        </form>
      </Card>

      <div className="grid gap-6">
        <Card title="最新分析结果">
          {!latest ? (
            <Empty>上传数学、物理、化学或学术英语错题后，AI分析会显示在这里，并自动保存到错题本。</Empty>
          ) : (
            <AnalysisCard item={latest} onMastery={updateMastery} onCopy={copyAnalysis} />
          )}
        </Card>

        <Card
          title="错题本"
          action={<div className="text-xs text-slate-500">共 {wrongQuestions.length} 道，待巩固 {weakCount} 道</div>}
        >
          <div className="mb-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
            <Field label="学生">
              <select className={inputClass} value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
                <option value="">全部学生</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="科目">
              <select className={inputClass} value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
                <option value="">全部科目</option>
                {subjects.map((subject) => (
                  <option key={subject}>{subject}</option>
                ))}
              </select>
            </Field>
            <Field label="掌握状态">
              <select className={inputClass} value={masteryFilter} onChange={(event) => setMasteryFilter(event.target.value)}>
                <option value="">全部状态</option>
                {Object.entries(masteryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="关键词">
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className={`${inputClass} w-full pl-9`} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="知识点/学生" />
              </div>
            </Field>
          </div>

          {filteredWrongQuestions.length === 0 ? (
            <Empty>暂无匹配的错题记录</Empty>
          ) : (
            <div className="grid gap-3">
              {filteredWrongQuestions.map((item) => (
                <AnalysisCard key={item.id} item={item} onMastery={updateMastery} onCopy={copyAnalysis} compact />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function AnalysisCard({
  item,
  onMastery,
  onCopy,
  compact,
}: {
  item: WrongQuestion;
  onMastery: (id: string, masteryStatus: string) => void;
  onCopy: (item: WrongQuestion) => void;
  compact?: boolean;
}) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-950">
            {item.student?.name} · {item.subject} · {item.knowledgePoint || "未标注知识点"}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {item.questionType || "题型待确认"} · {item.difficulty || "难度待确认"} · {formatDate(item.createdAt)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => onCopy(item)}>
            <Copy className="h-4 w-4" />
            复制
          </Button>
          <Link
            href={`/wrong-questions/${item.id}`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            详情
          </Link>
          <select className={`${inputClass} w-36`} value={item.masteryStatus} onChange={(event) => onMastery(item.id, event.target.value)}>
            {Object.entries(masteryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3 grid gap-3 text-sm leading-7 text-slate-700">
        <p>{item.aiAnalysis}</p>
        {!compact && (
          <>
            <div className="rounded-md bg-emerald-50 p-3">
              <div className="font-medium text-emerald-900">第一层提示</div>
              <p>{item.hintLevel1 || "-"}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="font-medium text-slate-900">第二层思路</div>
              <p>{item.hintLevel2 || "-"}</p>
            </div>
            <div>
              <div className="font-medium text-slate-900">完整解析</div>
              <p>{item.fullExplanation || "-"}</p>
            </div>
          </>
        )}
        <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-amber-900">
          <Clipboard className="mt-1 h-4 w-4 shrink-0" />
          <p>{item.reviewSuggestion || "建议安排同类题复习。"}</p>
        </div>
      </div>
    </article>
  );
}
