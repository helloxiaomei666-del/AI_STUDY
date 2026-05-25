"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, AlertTriangle, Building2, RotateCcw, Save, Settings } from "lucide-react";
import { Notice } from "@/components/notice";
import { Button, Card, Empty, Field, inputClass, textareaClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import {
  getMissingPromptVariables,
  getMissingWrongQuestionJsonFields,
  promptFeatureLabels,
  requiredPromptVariables,
  wrongQuestionJsonFields,
  type PromptFeatureType,
} from "@/lib/prompt-requirements";

type StoreItem = {
  id: string;
  name: string;
  packageType?: string | null;
  packageExpireAt?: string | null;
  status: string;
  owner?: { name: string; phone?: string | null } | null;
  quotas: Array<{
    wrongQuestionQuota: number;
    studyPlanQuota: number;
    dailyReportQuota: number;
  }>;
  _count: { students: number; users: number };
};
type PackageItem = {
  id: string;
  name: string;
  monthlyPrice: string;
  studentLimit: number;
  wrongQuestionQuota: number;
  studyPlanQuota: number;
  dailyReportQuota: number;
  staffLimit: number;
  status: string;
};
type PromptItem = {
  id: string;
  featureType: PromptFeatureType;
  name: string;
  modelName: string;
  temperature: string;
  version: number;
  status: string;
  systemPrompt: string;
  userPromptTemplate: string;
};
type FailureLogItem = {
  id: string;
  featureType: string;
  modelName: string;
  errorMessage: string;
  durationMs: number;
  createdAt: string;
  store?: { name: string } | null;
  user?: { name: string } | null;
};
type SystemStatus = {
  database: boolean;
  authSecret: boolean;
  aiProvider: string;
  openaiKey: boolean;
  uploadProvider: string;
  usageCount: number;
  recentFailures: FailureLogItem[];
};

async function readApiJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, error: text || "接口没有返回有效 JSON" };
  }
}

export function AdminPanel({
  stores,
  packages,
  prompts,
  systemStatus,
}: {
  stores: StoreItem[];
  packages: PackageItem[];
  prompts: PromptItem[];
  systemStatus: SystemStatus;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitJson(url: string, method: string, payload: Record<string, FormDataEntryValue | string>) {
    if (submitting) return false;
    setMessage("");
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readApiJson(response);
      if (!result.ok) {
        setError(result.error || "操作失败");
        return false;
      }
    } catch {
      setError("网络异常，请稍后重试");
      return false;
    } finally {
      setSubmitting(false);
    }
    setMessage("操作已保存");
    router.refresh();
    return true;
  }

  async function createStore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submitJson("/api/admin/stores", "POST", Object.fromEntries(new FormData(event.currentTarget)));
    if (ok) event.currentTarget.reset();
  }

  async function updateQuota(event: React.FormEvent<HTMLFormElement>, storeId: string) {
    event.preventDefault();
    await submitJson(`/api/admin/stores/${storeId}/quota`, "PATCH", Object.fromEntries(new FormData(event.currentTarget)));
  }

  async function createPackage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submitJson("/api/admin/packages", "POST", Object.fromEntries(new FormData(event.currentTarget)));
    if (ok) event.currentTarget.reset();
  }

  async function updatePackage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitJson("/api/admin/packages", "PATCH", Object.fromEntries(new FormData(event.currentTarget)));
  }

  async function savePrompt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitJson("/api/admin/prompt-templates", "PATCH", Object.fromEntries(new FormData(event.currentTarget)));
  }

  async function restorePrompt(id: string) {
    await submitJson("/api/admin/prompt-templates", "PATCH", { id, restoreDefault: "true" });
  }

  return (
    <div className="grid gap-6">
      <Notice message={message} type="success" />
      <Notice message={error} type="error" />

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card
          title="系统状态"
          action={
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Activity className="h-4 w-4" />
              AI调用 {systemStatus.usageCount} 次
            </span>
          }
        >
          <div className="grid gap-2 text-sm">
            {[
              ["数据库", systemStatus.database ? "已配置" : "缺失", systemStatus.database],
              ["登录密钥", systemStatus.authSecret ? "已配置" : "缺失", systemStatus.authSecret],
              ["AI Provider", systemStatus.aiProvider, systemStatus.openaiKey],
              ["上传存储", systemStatus.uploadProvider, systemStatus.uploadProvider === "local" || systemStatus.uploadProvider === "oss"],
            ].map(([label, value, ok]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                <span className="text-slate-600">{label}</span>
                <span className={ok ? "font-medium text-emerald-700" : "font-medium text-rose-700"}>{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="最近AI失败">
          {systemStatus.recentFailures.length === 0 ? (
            <Empty>暂无AI失败记录</Empty>
          ) : (
            <div className="grid gap-2">
              {systemStatus.recentFailures.map((item) => (
                <div key={item.id} className="rounded-md border border-amber-100 bg-amber-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium text-amber-950">
                      <AlertTriangle className="h-4 w-4" />
                      {item.featureType} · {item.modelName}
                    </div>
                    <span className="text-xs text-amber-700">{formatDate(item.createdAt)} · {item.durationMs}ms</span>
                  </div>
                  <div className="mt-1 text-amber-900">{item.errorMessage}</div>
                  <div className="mt-1 text-xs text-amber-700">
                    {item.store?.name || "-"} · {item.user?.name || "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card title="创建门店">
          <form className="grid gap-3" onSubmit={createStore}>
            <Field label="门店名称">
              <input className={inputClass} name="name" required placeholder="例如：XX AI自习室" />
            </Field>
            <Field label="老板姓名">
              <input className={inputClass} name="ownerName" required />
            </Field>
            <Field label="老板手机号">
              <input className={inputClass} name="ownerPhone" required />
            </Field>
            <Field label="老板邮箱">
              <input className={inputClass} name="ownerEmail" type="email" />
            </Field>
            <Field label="初始密码">
              <input className={inputClass} name="password" defaultValue="123456" />
            </Field>
            <Field label="套餐">
              <select className={inputClass} name="packageId" required>
                <option value="">请选择套餐</option>
                {packages.filter((item) => item.status === "active").map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · ￥{item.monthlyPrice}/月
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" disabled={submitting}>
              <Building2 className="h-4 w-4" />
              {submitting ? "处理中..." : "创建门店"}
            </Button>
          </form>
        </Card>

        <Card title="门店与额度">
          {stores.length === 0 ? (
            <Empty>暂无门店</Empty>
          ) : (
            <div className="grid gap-4">
              {stores.map((store) => {
                const quota = store.quotas[0];
                return (
                  <form key={store.id} className="rounded-md border border-slate-200 p-4" onSubmit={(event) => updateQuota(event, store.id)}>
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">{store.name}</div>
                        <div className="text-sm text-slate-500">
                          {store.owner?.name || "-"} · {store.owner?.phone || "-"} · 学生 {store._count.students}
                        </div>
                        <div className="text-xs text-slate-400">
                          {store.packageType || "未配置套餐"} · 到期 {formatDate(store.packageExpireAt)}
                        </div>
                      </div>
                      <select className={`${inputClass} w-32`} name="status" defaultValue={store.status}>
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                        <option value="disabled">disabled</option>
                      </select>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <Field label="错题额度">
                        <input className={inputClass} name="wrongQuestionQuota" type="number" defaultValue={quota?.wrongQuestionQuota ?? 0} />
                      </Field>
                      <Field label="计划额度">
                        <input className={inputClass} name="studyPlanQuota" type="number" defaultValue={quota?.studyPlanQuota ?? 0} />
                      </Field>
                      <Field label="日报额度">
                        <input className={inputClass} name="dailyReportQuota" type="number" defaultValue={quota?.dailyReportQuota ?? 0} />
                      </Field>
                      <div className="flex items-end">
                        <Button type="submit" className="w-full" variant="secondary" disabled={submitting}>
                          <Save className="h-4 w-4" />
                          {submitting ? "处理中..." : "保存"}
                        </Button>
                      </div>
                    </div>
                  </form>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card title="套餐管理">
        <div className="grid gap-4">
          <form className="grid gap-3 rounded-md border border-slate-200 p-4" onSubmit={createPackage}>
            <div className="font-semibold text-slate-950">新增套餐</div>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="套餐名称">
                <input className={inputClass} name="name" required placeholder="例如：试点版" />
              </Field>
              <Field label="月费">
                <input className={inputClass} name="monthlyPrice" type="number" min="0" step="0.01" defaultValue="399" required />
              </Field>
              <Field label="学生上限">
                <input className={inputClass} name="studentLimit" type="number" min="1" defaultValue="50" required />
              </Field>
              <Field label="员工上限">
                <input className={inputClass} name="staffLimit" type="number" min="1" defaultValue="5" required />
              </Field>
              <Field label="错题额度">
                <input className={inputClass} name="wrongQuestionQuota" type="number" min="0" defaultValue="200" required />
              </Field>
              <Field label="计划额度">
                <input className={inputClass} name="studyPlanQuota" type="number" min="0" defaultValue="100" required />
              </Field>
              <Field label="日报额度">
                <input className={inputClass} name="dailyReportQuota" type="number" min="0" defaultValue="300" required />
              </Field>
              <Field label="状态">
                <select className={inputClass} name="status" defaultValue="active">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="disabled">disabled</option>
                </select>
              </Field>
            </div>
            <Button type="submit" variant="secondary" disabled={submitting} className="w-fit">
              <Save className="h-4 w-4" />
              {submitting ? "处理中..." : "创建套餐"}
            </Button>
          </form>

          <div className="grid gap-3">
            {packages.map((item) => (
              <form key={item.id} className="grid gap-3 rounded-md border border-slate-200 p-4" onSubmit={updatePackage}>
                <input type="hidden" name="id" value={item.id} />
                <div className="grid gap-3 md:grid-cols-4">
                  <Field label="套餐名称">
                    <input className={inputClass} name="name" defaultValue={item.name} required />
                  </Field>
                  <Field label="月费">
                    <input className={inputClass} name="monthlyPrice" type="number" min="0" step="0.01" defaultValue={item.monthlyPrice} required />
                  </Field>
                  <Field label="学生上限">
                    <input className={inputClass} name="studentLimit" type="number" min="1" defaultValue={item.studentLimit} required />
                  </Field>
                  <Field label="员工上限">
                    <input className={inputClass} name="staffLimit" type="number" min="1" defaultValue={item.staffLimit} required />
                  </Field>
                  <Field label="错题额度">
                    <input className={inputClass} name="wrongQuestionQuota" type="number" min="0" defaultValue={item.wrongQuestionQuota} required />
                  </Field>
                  <Field label="计划额度">
                    <input className={inputClass} name="studyPlanQuota" type="number" min="0" defaultValue={item.studyPlanQuota} required />
                  </Field>
                  <Field label="日报额度">
                    <input className={inputClass} name="dailyReportQuota" type="number" min="0" defaultValue={item.dailyReportQuota} required />
                  </Field>
                  <Field label="状态">
                    <select className={inputClass} name="status" defaultValue={item.status}>
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="disabled">disabled</option>
                    </select>
                  </Field>
                </div>
                <Button type="submit" variant="secondary" disabled={submitting} className="w-fit">
                  <Save className="h-4 w-4" />
                  {submitting ? "处理中..." : "保存套餐"}
                </Button>
              </form>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Prompt模板">
        <div className="grid gap-4">
          {prompts.map((prompt) => {
            const missingVariables = getMissingPromptVariables(prompt.featureType, prompt.userPromptTemplate);
            const missingJsonFields =
              prompt.featureType === "wrong_question" ? getMissingWrongQuestionJsonFields(prompt.userPromptTemplate) : [];
            return (
              <form key={prompt.id} className="grid gap-3 rounded-md border border-slate-200 p-4" onSubmit={savePrompt}>
                <input type="hidden" name="id" value={prompt.id} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-semibold text-slate-950">
                    {promptFeatureLabels[prompt.featureType]} / {prompt.featureType} · v{prompt.version}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input className={`${inputClass} w-40`} name="modelName" defaultValue={prompt.modelName} />
                    <select className={`${inputClass} w-32`} name="status" defaultValue={prompt.status}>
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="disabled">disabled</option>
                    </select>
                  </div>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="font-medium text-slate-800">必须保留变量</div>
                  <div className="mt-1 break-words">{requiredPromptVariables[prompt.featureType].map((name) => `{{${name}}}`).join(" ")}</div>
                  {prompt.featureType === "wrong_question" && (
                    <>
                      <div className="mt-2 font-medium text-slate-800">错题 JSON 字段</div>
                      <div className="mt-1 break-words">{wrongQuestionJsonFields.join(", ")}</div>
                    </>
                  )}
                  {(missingVariables.length > 0 || missingJsonFields.length > 0) && (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
                      当前版本缺少：
                      {[...missingVariables.map((name) => `{{${name}}}`), ...missingJsonFields].join(", ")}
                    </div>
                  )}
                </div>
                <Field label="模板名称">
                  <input className={inputClass} name="name" defaultValue={prompt.name} />
                </Field>
                <Field label="System Prompt">
                  <textarea className={textareaClass} name="systemPrompt" defaultValue={prompt.systemPrompt} />
                </Field>
                <Field label="User Prompt Template">
                  <textarea className={`${textareaClass} min-h-40`} name="userPromptTemplate" defaultValue={prompt.userPromptTemplate} />
                </Field>
                <input type="hidden" name="temperature" value={prompt.temperature} />
                <input type="hidden" name="featureType" value={prompt.featureType} />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="secondary" disabled={submitting}>
                    <Settings className="h-4 w-4" />
                    {submitting ? "处理中..." : "保存为新版本"}
                  </Button>
                  <Button type="button" variant="secondary" disabled={submitting} onClick={() => restorePrompt(prompt.id)}>
                    <RotateCcw className="h-4 w-4" />
                    恢复默认模板
                  </Button>
                </div>
              </form>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
