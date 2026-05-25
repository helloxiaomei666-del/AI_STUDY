"use client";

import { useState } from "react";
import { ClipboardList, Copy, MessageSquareText, Sparkles } from "lucide-react";
import { Notice } from "@/components/notice";
import { Button, Card, Field, inputClass, textareaClass } from "@/components/ui";
import { copyText } from "@/lib/client-clipboard";
import { formatDate } from "@/lib/format";

type StudentOption = { id: string; name: string; grade: string; parentName?: string | null; weakPoints: string };
type WrongQuestionOption = {
  id: string;
  subject: string;
  knowledgePoint?: string | null;
  reviewSuggestion?: string | null;
  createdAt: string;
  student: { id: string; name: string };
};

async function readApiJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, error: text || "接口没有返回有效 JSON" };
  }
}

export function WorkflowBoard({
  students,
  wrongQuestions,
}: {
  students: StudentOption[];
  wrongQuestions: WrongQuestionOption[];
}) {
  const [studentId, setStudentId] = useState("");
  const [wrongQuestionIds, setWrongQuestionIds] = useState<string[]>([]);
  const [availableMinutes, setAvailableMinutes] = useState(120);
  const [focusSubject, setFocusSubject] = useState("");
  const [studyDuration, setStudyDuration] = useState("2小时");
  const [studyContent, setStudyContent] = useState("");
  const [completionStatus, setCompletionStatus] = useState("基本完成");
  const [studyStatus, setStudyStatus] = useState("比较专注");
  const [staffNote, setStaffNote] = useState("");
  const [plan, setPlan] = useState("");
  const [report, setReport] = useState("");
  const [planId, setPlanId] = useState("");
  const [reportId, setReportId] = useState("");
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedStudent = students.find((student) => student.id === studentId);
  const studentWrongQuestions = wrongQuestions.filter((item) => item.student.id === studentId);

  function toggleWrongQuestion(id: string) {
    setWrongQuestionIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function apiRequest(url: string, init: RequestInit) {
    try {
      const response = await fetch(url, init);
      return readApiJson(response);
    } catch {
      return { ok: false, error: "网络异常，请稍后重试" };
    }
  }

  async function generatePlan() {
    setError("");
    setMessage("");
    setLoading("plan");
    const result = await apiRequest("/api/study-plans/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        planType: "today",
        availableMinutes,
        focusSubject,
      }),
    });
    setLoading("");
    if (!result.ok || !result.data) {
      setError(result.error || "学习计划生成失败");
      return;
    }
    setPlan(result.data.content);
    setPlanId(result.data.id);
    setMessage("学习计划已生成");
  }

  async function savePlan() {
    if (!planId) return;
    setLoading("savePlan");
    const result = await apiRequest(`/api/study-plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: plan }),
    });
    setLoading("");
    if (!result.ok) {
      setError(result.error || "学习计划保存失败");
      return;
    }
    setMessage("学习计划已保存");
  }

  async function generateReport() {
    setError("");
    setMessage("");
    setLoading("report");
    const result = await apiRequest("/api/daily-reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        studyDuration,
        studyContent,
        completionStatus,
        studyStatus,
        staffNote,
        wrongQuestionIds,
      }),
    });
    setLoading("");
    if (!result.ok || !result.data) {
      setError(result.error || "家长日报生成失败");
      return;
    }
    setReport(result.data.content);
    setReportId(result.data.id);
    setMessage("家长日报已生成");
  }

  async function saveReport() {
    if (!reportId) return;
    setLoading("saveReport");
    const result = await apiRequest(`/api/daily-reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: report }),
    });
    setLoading("");
    if (!result.ok) {
      setError(result.error || "家长日报保存失败");
      return;
    }
    setMessage("家长日报已保存");
  }

  async function copyReport() {
    try {
      await copyText(report);
    } catch {
      setError("复制失败，请手动选择日报内容复制");
      return;
    }
    if (reportId) {
      const result = await apiRequest(`/api/daily-reports/${reportId}/copy`, { method: "POST" });
      if (!result.ok) {
        setError(result.error || "复制次数记录失败");
        return;
      }
    }
    setMessage("家长日报已复制");
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Notice message={message} type="success" />
        <Notice message={error} type="error" />
      </div>

      <Card title="今日督学输入">
        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="学生">
            <select
              className={inputClass}
              value={studentId}
              onChange={(event) => {
                setStudentId(event.target.value);
                setWrongQuestionIds([]);
                setPlan("");
                setReport("");
              }}
            >
              <option value="">请选择学生</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.grade}
                </option>
              ))}
            </select>
          </Field>
          <Field label="今日可学习时间">
            <input className={inputClass} type="number" min={20} max={600} value={availableMinutes} onChange={(event) => setAvailableMinutes(Number(event.target.value))} />
          </Field>
          <Field label="学习重点">
            <input className={inputClass} value={focusSubject} onChange={(event) => setFocusSubject(event.target.value)} placeholder={selectedStudent?.weakPoints || "例如：一次函数或学术英语句法"} />
          </Field>
        </div>
        {selectedStudent && (
          <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
            {selectedStudent.name} · 家长称呼：{selectedStudent.parentName || "未填写"} · 薄弱点：{selectedStudent.weakPoints || "-"}
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="学习计划">
          <div className="grid gap-3">
            <Button type="button" onClick={generatePlan} disabled={!studentId || loading === "plan"}>
              <ClipboardList className="h-4 w-4" />
              {loading === "plan" ? "生成中..." : "生成今日学习计划"}
            </Button>
            <textarea
              className={`${textareaClass} min-h-96`}
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
              placeholder="生成后的学习计划会显示在这里，可人工修改后保存。"
            />
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={savePlan} disabled={!planId || loading === "savePlan"}>
                {loading === "savePlan" ? "保存中..." : "保存计划"}
              </Button>
            </div>
          </div>
        </Card>

        <Card title="家长日报">
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="学习时长">
                <input className={inputClass} value={studyDuration} onChange={(event) => setStudyDuration(event.target.value)} />
              </Field>
              <Field label="任务完成情况">
                <select className={inputClass} value={completionStatus} onChange={(event) => setCompletionStatus(event.target.value)}>
                  <option>全部完成</option>
                  <option>基本完成</option>
                  <option>部分完成</option>
                  <option>未完成</option>
                </select>
              </Field>
            </div>
            <Field label="今日学习内容">
              <textarea className={textareaClass} value={studyContent} onChange={(event) => setStudyContent(event.target.value)} placeholder="例如：数学一次函数错题复盘、物理受力分析、化学方程式配平、学术英语阅读证据定位" />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="今日状态">
                <select className={inputClass} value={studyStatus} onChange={(event) => setStudyStatus(event.target.value)}>
                  <option>专注</option>
                  <option>比较专注</option>
                  <option>一般</option>
                  <option>易分心</option>
                </select>
              </Field>
              <Field label="督学备注">
                <input className={inputClass} value={staffNote} onChange={(event) => setStaffNote(event.target.value)} placeholder="可选" />
              </Field>
            </div>
            <Field label="关联错题">
              <div className="max-h-36 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2">
                {!studentId ? (
                  <div className="text-sm text-slate-500">先选择学生</div>
                ) : studentWrongQuestions.length === 0 ? (
                  <div className="text-sm text-slate-500">该学生暂无待巩固错题</div>
                ) : (
                  <div className="grid gap-2">
                    {studentWrongQuestions.map((item) => (
                      <label key={item.id} className="flex items-start gap-2 rounded-md bg-white p-2 text-sm">
                        <input type="checkbox" checked={wrongQuestionIds.includes(item.id)} onChange={() => toggleWrongQuestion(item.id)} />
                        <span>
                          {item.subject} · {item.knowledgePoint || "未标注"} · {formatDate(item.createdAt)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <Button type="button" onClick={generateReport} disabled={!studentId || !studyContent || loading === "report"}>
              <MessageSquareText className="h-4 w-4" />
              {loading === "report" ? "生成中..." : "生成家长日报"}
            </Button>
            <textarea
              className={`${textareaClass} min-h-72`}
              value={report}
              onChange={(event) => setReport(event.target.value)}
              placeholder="生成后的家长日报会显示在这里，可修改、保存并复制。"
            />
            <div className="flex flex-wrap justify-between gap-3">
              <Button type="button" variant="secondary" onClick={saveReport} disabled={!reportId || loading === "saveReport"}>
                <Sparkles className="h-4 w-4" />
                {loading === "saveReport" ? "保存中..." : "保存日报"}
              </Button>
              <Button type="button" variant="secondary" onClick={copyReport} disabled={!report}>
                <Copy className="h-4 w-4" />
                复制日报
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
