"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Flag,
  ListChecks,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import { Notice } from "@/components/notice";
import { Button, Card, Empty, Field, inputClass, textareaClass } from "@/components/ui";
import { cn, formatDate } from "@/lib/format";
import { scienceSubjects } from "@/lib/subjects";

type WrongQuestion = {
  id: string;
  subject: string;
  knowledgePoint?: string | null;
  aiAnalysis: string;
  hintLevel1?: string | null;
  hintLevel2?: string | null;
  fullExplanation?: string | null;
  reviewSuggestion?: string | null;
  masteryStatus: string;
  createdAt: string;
};

type StudyPlan = {
  id: string;
  content: string;
  createdAt: string;
  availableMinutes: number;
};

type ChallengeState = {
  wrongQuestionId?: string;
  step: number;
  selfTag?: string;
  condition?: string;
  firstStep?: string;
  verification?: string;
  result?: "passed" | "partial" | "needs_help";
};

type PortalMode = "remedial" | "advanced";

type ChemistryModule = {
  id: string;
  title: string;
  summary: string;
  core: string[];
  example: string;
  pitfall: string;
  challenge: string;
  quiz: Array<{
    question: string;
    options: string[];
    answer: number;
    explain: string;
  }>;
};

const stepNames = ["错因自评", "关键条件", "第一步判断", "验证回答"];

const chemistryModules: ChemistryModule[] = [
  {
    id: "world",
    title: "走进化学世界",
    summary: "先建立化学学科的基本视角：观察现象、记录证据、区分猜想和结论。",
    core: ["化学研究物质的组成、结构、性质和变化", "实验现象不能等同于实验结论", "安全操作是学习化学的前提"],
    example: "蜡烛燃烧时看到火焰、放热、生成水雾和二氧化碳，这些现象共同支持它发生了化学变化。",
    pitfall: "把“看到白烟”直接写成“生成二氧化碳”属于证据不足，考试中容易丢分。",
    challenge: "请用一句话说明：为什么化学实验要先写现象，再写结论？",
    quiz: [
      {
        question: "下列哪一项更像实验现象，而不是结论？",
        options: ["生成了二氧化碳", "产生无色气体", "发生了化学反应", "物质被氧化"],
        answer: 1,
        explain: "“产生无色气体”是直接观察到的现象，其他选项都需要进一步验证。",
      },
      {
        question: "化学主要研究什么？",
        options: ["物质及其变化", "天体运动", "古文阅读", "社会制度"],
        answer: 0,
        explain: "化学关注物质的组成、结构、性质和变化。",
      },
      {
        question: "闻气体气味时更安全的方式是？",
        options: ["直接凑近闻", "用手轻轻扇闻", "用嘴吹气", "密闭加热"],
        answer: 1,
        explain: "扇闻可以降低吸入刺激性或有害气体的风险。",
      },
    ],
  },
  {
    id: "change",
    title: "物质的变化和性质",
    summary: "区分物理变化、化学变化、物理性质和化学性质，这是初三化学最基础的判断能力。",
    core: ["是否有新物质生成是判断化学变化的关键", "颜色、状态、密度常属于物理性质", "可燃性、氧化性常属于化学性质"],
    example: "冰融化没有新物质生成，是物理变化；铁生锈生成了新物质，是化学变化。",
    pitfall: "发光、放热、变色不一定就是化学变化，仍要看是否有新物质生成。",
    challenge: "请举一个生活中的化学变化，并说明判断依据。",
    quiz: [
      {
        question: "判断化学变化的核心依据是？",
        options: ["颜色改变", "有新物质生成", "温度升高", "形状改变"],
        answer: 1,
        explain: "颜色、温度、形状都可能变化，但核心依据是是否生成新物质。",
      },
      {
        question: "下列属于物理变化的是？",
        options: ["纸张燃烧", "铁钉生锈", "水结冰", "食物腐败"],
        answer: 2,
        explain: "水结冰只是状态改变，没有生成新物质。",
      },
      {
        question: "可燃性属于哪类性质？",
        options: ["物理性质", "化学性质", "形状特征", "实验误差"],
        answer: 1,
        explain: "可燃性需要通过化学变化表现出来，属于化学性质。",
      },
    ],
  },
  {
    id: "oxygen",
    title: "空气与氧气",
    summary: "理解空气成分、氧气性质、助燃与燃烧条件，建立实验现象和气体性质之间的联系。",
    core: ["空气主要由氮气和氧气组成", "氧气能支持燃烧但本身不是可燃物", "燃烧通常需要可燃物、氧气和温度达到着火点"],
    example: "带火星木条在氧气中复燃，说明氧气具有助燃性。",
    pitfall: "不要把“氧气助燃”写成“氧气可燃”。这是初学者高频错误。",
    challenge: "请说明为什么灭火可以通过隔绝空气实现。",
    quiz: [
      {
        question: "氧气的典型性质是？",
        options: ["可燃", "助燃", "有刺激性气味", "能使澄清石灰水变浑浊"],
        answer: 1,
        explain: "氧气支持燃烧，但氧气本身不是可燃物。",
      },
      {
        question: "空气中含量最多的气体通常是？",
        options: ["氧气", "氮气", "二氧化碳", "稀有气体"],
        answer: 1,
        explain: "空气中氮气约占78%，氧气约占21%。",
      },
      {
        question: "带火星木条复燃常用于检验？",
        options: ["氧气", "氮气", "水蒸气", "氢气"],
        answer: 0,
        explain: "氧气能使带火星木条复燃。",
      },
    ],
  },
  {
    id: "atom",
    title: "分子、原子、元素",
    summary: "从微观角度理解物质组成，分清分子、原子、元素和化学符号。",
    core: ["分子是保持物质化学性质的一种粒子", "原子是化学变化中的最小粒子", "元素表示具有相同质子数的一类原子"],
    example: "水由水分子构成，水分子由氢原子和氧原子构成。",
    pitfall: "元素只讲种类，不讲个数；原子和分子才常涉及个数。",
    challenge: "请解释“水由氢元素和氧元素组成”与“一个水分子由两个氢原子和一个氧原子构成”的区别。",
    quiz: [
      {
        question: "化学变化中的最小粒子通常是？",
        options: ["分子", "原子", "元素", "混合物"],
        answer: 1,
        explain: "化学变化中分子可分，原子不可再分。",
      },
      {
        question: "元素概念的核心依据是？",
        options: ["中子数", "质子数", "电子层数", "颜色"],
        answer: 1,
        explain: "具有相同质子数的一类原子属于同种元素。",
      },
      {
        question: "H2O 中的 2 表示？",
        options: ["两个水分子", "一个水分子中有两个氢原子", "两个氧原子", "水的质量"],
        answer: 1,
        explain: "化学式中元素符号右下角数字表示一个分子中该原子的个数。",
      },
    ],
  },
  {
    id: "formula",
    title: "化学式与化合价",
    summary: "掌握常见元素符号、化学式含义和化合价规则，为方程式学习做准备。",
    core: ["化学式表示物质组成", "化合物中正负化合价代数和为零", "常见元素和原子团化合价需要熟练掌握"],
    example: "MgO 中 Mg 通常显 +2 价，O 通常显 -2 价，正负代数和为0。",
    pitfall: "不要机械交叉下标，先判断元素或原子团的化合价是否正确。",
    challenge: "请尝试写出氧化铝的化学式，并说明你的依据。",
    quiz: [
      {
        question: "化合物中各元素化合价代数和通常为？",
        options: ["0", "1", "-1", "任意值"],
        answer: 0,
        explain: "化合物整体不显电性，所以化合价代数和为0。",
      },
      {
        question: "氧元素在多数化合物中常显？",
        options: ["+1", "+2", "-2", "0"],
        answer: 2,
        explain: "氧元素在多数化合物中常显 -2 价。",
      },
      {
        question: "CO2 中数字 2 表示？",
        options: ["两个二氧化碳分子", "一个分子中两个氧原子", "两个碳原子", "二氧化碳质量为2"],
        answer: 1,
        explain: "右下角数字表示一个分子中该原子的个数。",
      },
    ],
  },
  {
    id: "equation",
    title: "质量守恒与化学方程式",
    summary: "理解质量守恒定律，并能用化学方程式表达反应过程。",
    core: ["化学反应前后原子种类和数目不变", "配平方程式不是改变化学式", "质量守恒来自原子重新组合"],
    example: "氢气燃烧：2H2 + O2 = 2H2O，反应前后氢原子和氧原子数目相等。",
    pitfall: "配平时不能把 H2O 改成 H2O2，因为那会改变物质。",
    challenge: "请说明为什么化学方程式配平时只能改系数，不能改下标。",
    quiz: [
      {
        question: "化学反应前后一定不变的是？",
        options: ["分子种类", "物质状态", "原子种类和数目", "颜色"],
        answer: 2,
        explain: "化学反应本质是原子重新组合，原子种类和数目不变。",
      },
      {
        question: "配平方程式时可以改变什么？",
        options: ["化学式下标", "反应条件", "化学计量数", "元素符号"],
        answer: 2,
        explain: "配平只能改变化学计量数，不能改变物质的化学式。",
      },
      {
        question: "质量守恒定律适用于？",
        options: ["所有物理变化", "化学反应", "阅读理解", "价格变化"],
        answer: 1,
        explain: "质量守恒定律描述化学反应中反应物和生成物质量关系。",
      },
    ],
  },
];

const diagnosticQuestions = [
  {
    question: "你能分清“现象”和“结论”吗？",
    options: ["能，我会先写看到什么", "不太能，我经常直接写结论"],
  },
  {
    question: "你是否能接受少量化学符号学习？",
    options: ["可以，愿意记元素符号", "暂时不想记符号"],
  },
  {
    question: "看到实验现象时，你通常会怎么做？",
    options: ["先找证据，再判断原因", "直接猜答案"],
  },
  {
    question: "你现在学习初三化学的目的是什么？",
    options: ["提前建立优势", "只是随便看看"],
  },
];

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

function challengeConfig(item?: WrongQuestion | null) {
  const subject = item?.subject || "数学";
  const isEnglish = subject.includes("英语") || /english/i.test(subject);
  if (isEnglish) {
    return {
      tags: ["证据定位弱", "语法结构判断弱", "词义精确性不足", "句子关系没看懂", "我不知道"],
      conditions: ["原文证据句", "转折词或因果词", "主句谓语结构", "选项中的绝对化表达"],
      firstSteps: ["先找 evidence sentence", "先翻译全文", "先背单词", "直接看答案"],
      verificationPrompt: "请写出支持答案的原文证据句，或者说明你会先看哪一个语法结构。",
      target: "目标：不记答案，而是确认你能找到证据并说清理由。",
    };
  }
  return {
    tags: ["审题遗漏", "公式混淆", "单位错误", "变量关系不清", "计算粗心", "我不知道"],
    conditions: ["已知条件", "要求的问题", "会变化的两个量", "单位或范围限制"],
    firstSteps: ["先圈出已知条件", "先套最近学过的公式", "先算最终答案", "直接看解析"],
    verificationPrompt: "请写出这道题的第一步：你要先找什么？为什么？",
    target: "目标：先修正思考动作，再看完整解析。",
  };
}

export function StudentPortal({
  token,
  student,
  latestPlan,
  wrongQuestions,
}: {
  token: string;
  student: { name: string; grade: string; weakPoints?: string | null };
  latestPlan?: StudyPlan | null;
  wrongQuestions: WrongQuestion[];
}) {
  const [mode, setMode] = useState<PortalMode>("remedial");
  const modeSectionRef = useRef<HTMLDivElement | null>(null);
  const [rows, setRows] = useState(wrongQuestions);
  const [latest, setLatest] = useState<WrongQuestion | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState<ChallengeState>({ wrongQuestionId: wrongQuestions[0]?.id, step: wrongQuestions[0] ? 1 : 0 });

  const activeQuestion = useMemo(
    () => rows.find((item) => item.id === challenge.wrongQuestionId) || latest || rows[0] || null,
    [challenge.wrongQuestionId, latest, rows],
  );
  const config = challengeConfig(activeQuestion);
  const activeStep = Math.max(1, Math.min(4, challenge.step || 1));

  function activateMode(nextMode: PortalMode) {
    setMode(nextMode);
    window.setTimeout(() => {
      modeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  async function logInteraction(interactionType: string, content?: string, wrongQuestionId?: string) {
    try {
      await fetch(`/api/student-portal/${token}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wrongQuestionId, interactionType, content }),
      });
    } catch {
      // Demo telemetry should not block the student flow.
    }
  }

  async function handleFile(file?: File) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("图片不能超过 6MB");
      return;
    }
    setImageDataUrl(await readFileAsDataUrl(file));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    let result: { ok?: boolean; error?: string; data?: WrongQuestion } = {};
    try {
      const response = await fetch(`/api/student-portal/${token}/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      setError(result.error || "AI分析失败");
      return;
    }
    setLatest(result.data);
    setRows((current) => [result.data as WrongQuestion, ...current]);
    setChallenge({ wrongQuestionId: result.data.id, step: 1 });
    setImageDataUrl(null);
    formElement.reset();
    setMessage("错题已进入AI闯关复盘。先完成4个小动作，再决定是否看完整解析。");
  }

  async function updateMastery(id: string, masteryStatus: string, content?: string) {
    let result: { ok?: boolean; error?: string; data?: WrongQuestion } = {};
    try {
      const response = await fetch(`/api/student-portal/${token}/wrong-questions/${id}/mastery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masteryStatus, content }),
      });
      result = await readApiJson(response);
    } catch {
      result = { ok: false, error: "网络异常，请稍后重试" };
    }
    if (!result.ok) {
      setError(result.error || "掌握状态更新失败");
      return;
    }
    setRows((current) => current.map((item) => (item.id === id ? { ...item, masteryStatus } : item)));
    setMessage("状态已记录，督学后台可以看到你的复盘结果。");
  }

  function chooseSelfTag(tag: string) {
    setChallenge((current) => ({ ...current, selfTag: tag, step: 2 }));
    logInteraction("challenge_self_tag", tag, activeQuestion?.id);
  }

  function chooseCondition(condition: string) {
    setChallenge((current) => ({ ...current, condition, step: 3 }));
    logInteraction("challenge_condition", condition, activeQuestion?.id);
  }

  function chooseFirstStep(firstStep: string) {
    setChallenge((current) => ({ ...current, firstStep, step: 4 }));
    logInteraction("challenge_first_step", firstStep, activeQuestion?.id);
  }

  function submitVerification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const answer = String(new FormData(event.currentTarget).get("verification") || "").trim();
    if (!answer) {
      setError("先写一句自己的判断，再提交。");
      return;
    }
    const weakSignal = challenge.selfTag === "我不知道" || answer.length < 8;
    const result = weakSignal ? "needs_help" : answer.length < 18 ? "partial" : "passed";
    setChallenge((current) => ({ ...current, verification: answer, result }));
    logInteraction("challenge_verification", `${result}: ${answer}`, activeQuestion?.id);
    setMessage(result === "needs_help" ? "已记录为需要督学介入。这一步需要人帮你拆开。" : "验证回答已记录，继续完成最后一步。");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">智习管家学生学习端</div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            {student.name} · {student.grade}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            学生端分为两块：错题补弱处理当前不会的题；AI学业助手帮助学生完成预习、复习、总结和验证，并在过程中培养AI素养。
          </p>
        </div>

        <section className="overflow-hidden rounded-lg border border-emerald-200 bg-emerald-900 p-5 text-white shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-emerald-50">
                <Sparkles className="h-4 w-4" />
                AI学业助手
              </div>
              <h2 className="mt-4 text-2xl font-semibold">用AI辅助完成真实学习任务</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50">
                选择科目和任务，放入课堂笔记、教材片段或作业要求。AI会带你预习、复习、解释、总结和检查理解，同时提醒你如何验证AI回答。
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="!border-emerald-200 !bg-emerald-50 !text-emerald-950 hover:!bg-emerald-100"
                  onClick={() => activateMode("advanced")}
                >
                  <Sparkles className="h-4 w-4" />
                  开始AI学业助手
                </Button>
                <Button type="button" variant="secondary" className="border-white/30 bg-white/10 text-white hover:bg-white/15" onClick={() => activateMode("remedial")}>
                  先做错题补弱
                </Button>
              </div>
            </div>
            <div className="grid gap-3 text-sm">
              {["围绕真实学业任务学习", "顺带训练AI提问与验证", "生成给督学看的学习证据"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-md border border-white/15 bg-white/10 px-3 py-3 text-left transition hover:border-emerald-100 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  onClick={() => activateMode("advanced")}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div ref={modeSectionRef} className="grid scroll-mt-6 gap-3 sm:grid-cols-[1.2fr_0.8fr]">
          <button
            type="button"
            onClick={() => activateMode("advanced")}
            className={cn(
              "rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-200",
              mode === "advanced" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50",
            )}
          >
            <div className="flex items-center gap-2 font-semibold text-slate-950">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              AI学业助手
            </div>
            <div className="mt-1 text-sm text-slate-600">亮点功能：用AI辅助预习、复习、解释材料和检查理解，同时培养AI素养。</div>
          </button>
          <button
            type="button"
            onClick={() => activateMode("remedial")}
            className={cn(
              "rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-200",
              mode === "remedial" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50",
            )}
          >
            <div className="font-semibold text-slate-950">AI错题闯关</div>
            <div className="mt-1 text-sm text-slate-600">针对现有错题做补缺补差，识别卡点并提醒督学介入。</div>
          </button>
        </div>

        {mode === "remedial" ? (
          <RemedialMode
            rows={rows}
            latestPlan={latestPlan}
            imageDataUrl={imageDataUrl}
            loading={loading}
            message={message}
            error={error}
            activeQuestion={activeQuestion}
            activeStep={activeStep}
            challenge={challenge}
            config={config}
            onFile={handleFile}
            onSubmit={submit}
            onChooseSelfTag={chooseSelfTag}
            onChooseCondition={chooseCondition}
            onChooseFirstStep={chooseFirstStep}
            onSubmitVerification={submitVerification}
            onMastery={updateMastery}
            onSelectQuestion={(id) => setChallenge({ wrongQuestionId: id, step: 1 })}
          />
        ) : (
          <AcademicAssistantLab logInteraction={logInteraction} />
        )}
      </div>
    </main>
  );
}

function RemedialMode({
  rows,
  latestPlan,
  imageDataUrl,
  loading,
  message,
  error,
  activeQuestion,
  activeStep,
  challenge,
  config,
  onFile,
  onSubmit,
  onChooseSelfTag,
  onChooseCondition,
  onChooseFirstStep,
  onSubmitVerification,
  onMastery,
  onSelectQuestion,
}: {
  rows: WrongQuestion[];
  latestPlan?: StudyPlan | null;
  imageDataUrl: string | null;
  loading: boolean;
  message: string;
  error: string;
  activeQuestion: WrongQuestion | null;
  activeStep: number;
  challenge: ChallengeState;
  config: ReturnType<typeof challengeConfig>;
  onFile: (file?: File) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onChooseSelfTag: (tag: string) => void;
  onChooseCondition: (condition: string) => void;
  onChooseFirstStep: (firstStep: string) => void;
  onSubmitVerification: (event: React.FormEvent<HTMLFormElement>) => void;
  onMastery: (id: string, masteryStatus: string, content?: string) => void;
  onSelectQuestion: (id: string) => void;
}) {
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <Card title="上传错题进入闯关">
          <form className="grid gap-3" onSubmit={onSubmit}>
            <Notice message={message} type="success" />
            <Notice message={error} type="error" />
            <Field label="科目">
              <select className={inputClass} name="subject" required defaultValue={scienceSubjects[0]}>
                {scienceSubjects.map((subject) => (
                  <option key={subject}>{subject}</option>
                ))}
              </select>
            </Field>
            <Field label="错题图片">
              <input className={inputClass} type="file" accept="image/*" onChange={(event) => onFile(event.target.files?.[0])} />
            </Field>
            {imageDataUrl && (
              <Image
                src={imageDataUrl}
                alt="错题预览"
                width={420}
                height={220}
                unoptimized
                className="max-h-56 rounded-md border border-slate-200 object-contain"
              />
            )}
            <Field label="我觉得我卡在哪里">
              <textarea className={textareaClass} name="studentReason" placeholder="可以简单写，也可以先不写，后面系统会用按钮引导你。" />
            </Field>
            <Field label="补充题目文字">
              <textarea className={textareaClass} name="extraNote" placeholder="图片不清楚时，把题目文字补充在这里。" />
            </Field>
            <Button type="submit" disabled={loading || !imageDataUrl}>
              <Sparkles className="h-4 w-4" />
              {loading ? "AI建档中..." : "开始AI闯关"}
            </Button>
          </form>
        </Card>

        <div className="grid gap-6">
          <ChallengeDemo
            item={activeQuestion}
            step={activeStep}
            state={challenge}
            config={config}
            onChooseSelfTag={onChooseSelfTag}
            onChooseCondition={onChooseCondition}
            onChooseFirstStep={onChooseFirstStep}
            onSubmitVerification={onSubmitVerification}
            onMastery={onMastery}
          />

          <Card title="今日学习任务">
            {!latestPlan ? (
              <Empty>督学还没有生成今日学习计划。</Empty>
            ) : (
              <div className="rounded-md bg-slate-50 p-4">
                <div className="mb-2 text-xs text-slate-500">
                  {formatDate(latestPlan.createdAt)} · {latestPlan.availableMinutes}分钟
                </div>
                <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{latestPlan.content}</pre>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card title="我的错题闯关库">
        {rows.length === 0 ? (
          <Empty>暂无错题。上传第一道错题后，会自动进入闯关复盘。</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectQuestion(item.id)}
                className="rounded-md border border-slate-200 bg-white p-4 text-left hover:border-emerald-200 hover:bg-emerald-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-950">
                      {item.subject} · {item.knowledgePoint || "待识别知识点"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)}</div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{item.masteryStatus}</span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{item.reviewSuggestion || item.aiAnalysis}</p>
              </button>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function ChallengeDemo({
  item,
  step,
  state,
  config,
  onChooseSelfTag,
  onChooseCondition,
  onChooseFirstStep,
  onSubmitVerification,
  onMastery,
}: {
  item: WrongQuestion | null;
  step: number;
  state: ChallengeState;
  config: ReturnType<typeof challengeConfig>;
  onChooseSelfTag: (tag: string) => void;
  onChooseCondition: (condition: string) => void;
  onChooseFirstStep: (firstStep: string) => void;
  onSubmitVerification: (event: React.FormEvent<HTMLFormElement>) => void;
  onMastery: (id: string, masteryStatus: string, content?: string) => void;
}) {
  if (!item) {
    return (
      <Card title="AI闯关复盘">
        <Empty>先上传一道错题，AI会把它变成4关复盘任务。</Empty>
      </Card>
    );
  }

  const progress = Math.round((step / 4) * 100);
  const needsHelp = state.result === "needs_help" || state.selfTag === "我不知道";

  return (
    <Card
      title="AI闯关复盘 DEMO"
      action={
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
          <Target className="h-3.5 w-3.5" />
          {step}/4
        </span>
      }
    >
      <div className="grid gap-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium text-slate-950">
              {item.subject} · {item.knowledgePoint || "AI识别中"}
            </div>
            <div className="text-xs text-slate-500">{formatDate(item.createdAt)}</div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-emerald-700" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px] text-slate-500">
            {stepNames.map((name, index) => (
              <span key={name} className={index + 1 === step ? "font-medium text-emerald-700" : ""}>
                {name}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-amber-100 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          <div className="flex items-center gap-2 font-medium">
            <Flag className="h-4 w-4" />
            {config.target}
          </div>
          <div className="mt-1 text-xs">如果连续选择“我不知道”、验证回答过短或标记需要督学讲，后台会形成干预信号。</div>
        </div>

        {step === 1 && (
          <section className="grid gap-3">
            <div>
              <h3 className="font-semibold text-slate-950">第1关：你觉得自己错在哪里？</h3>
              <p className="mt-1 text-sm text-slate-500">不用写长句，先点一个最接近的原因。</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {config.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onChooseSelfTag(tag)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-3 text-left text-sm font-medium text-slate-800 hover:border-emerald-300 hover:bg-emerald-50"
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="grid gap-3">
            <div>
              <h3 className="font-semibold text-slate-950">第2关：这题最该先抓哪个关键点？</h3>
              <p className="mt-1 text-sm text-slate-500">AI会用你的选择判断你是在审题卡住，还是在方法卡住。</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {config.conditions.map((condition) => (
                <button
                  key={condition}
                  type="button"
                  onClick={() => onChooseCondition(condition)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-3 text-left text-sm font-medium text-slate-800 hover:border-emerald-300 hover:bg-emerald-50"
                >
                  {condition}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="grid gap-3">
            <div>
              <h3 className="font-semibold text-slate-950">第3关：第一步应该做什么？</h3>
              <p className="mt-1 text-sm text-slate-500">这一关不看答案，只判断学习动作是否正确。</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {config.firstSteps.map((firstStep) => (
                <button
                  key={firstStep}
                  type="button"
                  onClick={() => onChooseFirstStep(firstStep)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-3 text-left text-sm font-medium text-slate-800 hover:border-emerald-300 hover:bg-emerald-50"
                >
                  {firstStep}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="grid gap-3">
            <div>
              <h3 className="font-semibold text-slate-950">第4关：一句话验证你是否真的懂了</h3>
              <p className="mt-1 text-sm text-slate-500">{config.verificationPrompt}</p>
            </div>
            <form className="grid gap-3" onSubmit={onSubmitVerification}>
              <textarea className={textareaClass} name="verification" placeholder="写一句自己的判断，不用写完整解题过程。" defaultValue={state.verification || ""} />
              <Button type="submit" variant="secondary" className="w-fit">
                <ChevronRight className="h-4 w-4" />
                提交验证
              </Button>
            </form>
            {state.result && (
              <div className={`rounded-md p-3 text-sm leading-6 ${needsHelp ? "border border-amber-200 bg-amber-50 text-amber-900" : "border border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
                <div className="flex items-center gap-2 font-medium">
                  {needsHelp ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {needsHelp ? "建议督学介入" : state.result === "partial" ? "部分掌握" : "验证通过"}
                </div>
                <div className="mt-1">
                  {needsHelp
                    ? "这一步不是让你硬撑。系统会把这道题标给督学，适合让老师拆开讲。"
                    : "你已经完成复盘动作。下一步可以独立重做，或者标记为已掌握。"}
                </div>
              </div>
            )}
          </section>
        )}

        <div className="grid gap-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          <div className="flex items-center gap-2 font-medium text-slate-950">
            <ListChecks className="h-4 w-4" />
            本次复盘记录
          </div>
          <div className="grid gap-1">
            <div>错因自评：{state.selfTag || "未完成"}</div>
            <div>关键条件：{state.condition || "未完成"}</div>
            <div>第一步判断：{state.firstStep || "未完成"}</div>
            <div>验证回答：{state.verification || "未完成"}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!state.result}
            onClick={() => onMastery(item.id, "mastered", `challenge_result:${state.result}; verification:${state.verification || ""}`)}
          >
            <CheckCircle2 className="h-4 w-4" />
            我能独立完成
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onMastery(item.id, "focus", `challenge_needs_tutor; tag:${state.selfTag || ""}; verification:${state.verification || ""}`)}
          >
            <BookOpenCheck className="h-4 w-4" />
            需要督学讲
          </Button>
        </div>
      </div>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ChemistryAdvanceLab({ logInteraction }: { logInteraction: (interactionType: string, content?: string, wrongQuestionId?: string) => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [diagnosticScore, setDiagnosticScore] = useState<number | null>(null);
  const [activeModuleId, setActiveModuleId] = useState(chemistryModules[0].id);
  const [unlockedIndex, setUnlockedIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [materialName, setMaterialName] = useState("");

  const activeIndex = chemistryModules.findIndex((item) => item.id === activeModuleId);
  const activeModule = chemistryModules[Math.max(0, activeIndex)];
  const canOpenActive = activeIndex <= unlockedIndex;

  function finishDiagnostic() {
    const score = diagnosticQuestions.reduce((sum, _question, index) => sum + (answers[index] === 0 ? 1 : 0), 0);
    setDiagnosticScore(score);
    logInteraction("advanced_chemistry_diagnostic", `score:${score}/${diagnosticQuestions.length}`);
  }

  function handleMaterial(file?: File) {
    if (!file) return;
    setMaterialName(file.name);
    logInteraction("advanced_chemistry_material_uploaded", `${file.name}; ${Math.round(file.size / 1024)}KB`);
  }

  function submitQuiz() {
    const score = activeModule.quiz.reduce((sum, item, index) => sum + (quizAnswers[`${activeModule.id}-${index}`] === item.answer ? 1 : 0), 0);
    setQuizScore(score);
    logInteraction("advanced_chemistry_quiz", `${activeModule.title}; score:${score}/${activeModule.quiz.length}`);
    if (score >= 2) {
      setUnlockedIndex((current) => Math.max(current, Math.min(chemistryModules.length - 1, activeIndex + 1)));
    }
  }

  return (
    <div className="grid gap-6">
      <Card title="初三化学超前学习舱">
        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="grid gap-3 text-sm leading-7 text-slate-700">
            <p>
              第一版只做初三化学，不做全科。系统内置全国通用核心知识路径；不同地区教材版本先通过上传入口预留，后续再做目录解析和RAG适配。
            </p>
            <div className="grid gap-2 rounded-md bg-emerald-50 p-3 text-emerald-900">
              <div className="font-medium">学习规则</div>
              <div>先修诊断通过后开始学习；每节包含核心概念、生活例子、易错点、小测和挑战题；小测至少答对2题解锁下一节。</div>
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex items-center gap-2 font-medium text-slate-950">
              <Upload className="h-4 w-4" />
              教材/讲义上传预留
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              可上传本地区教材目录、学校讲义或进度截图。当前DEMO先记录文件名，后续用于知识点映射和本地化学习顺序。
            </p>
            <input className={`${inputClass} mt-3`} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(event) => handleMaterial(event.target.files?.[0])} />
            {materialName && <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">已记录：{materialName}</div>}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="grid gap-6">
          <Card title="AI先修诊断">
            <div className="grid gap-3">
              {diagnosticQuestions.map((item, index) => (
                <div key={item.question} className="rounded-md border border-slate-200 p-3">
                  <div className="text-sm font-medium text-slate-950">{item.question}</div>
                  <div className="mt-2 grid gap-2">
                    {item.options.map((option, optionIndex) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))}
                        className={cn(
                          "rounded-md border px-3 py-2 text-left text-sm",
                          answers[index] === optionIndex ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700",
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <Button type="button" disabled={Object.keys(answers).length < diagnosticQuestions.length} onClick={finishDiagnostic}>
                <Target className="h-4 w-4" />
                完成先修诊断
              </Button>
              {diagnosticScore !== null && (
                <div className={`rounded-md p-3 text-sm ${diagnosticScore >= 3 ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                  诊断结果：{diagnosticScore}/{diagnosticQuestions.length}。
                  {diagnosticScore >= 3 ? "适合进入初三化学超前学习。" : "建议降低节奏，先从观察现象和安全操作开始。"}
                </div>
              )}
            </div>
          </Card>

          <Card title="通用知识路径">
            <div className="grid gap-2">
              {chemistryModules.map((item, index) => {
                const unlocked = index <= unlockedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      setActiveModuleId(item.id);
                      setQuizScore(null);
                    }}
                    className={cn(
                      "rounded-md border px-3 py-3 text-left text-sm",
                      item.id === activeModuleId ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white",
                      !unlocked && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-950">{index + 1}. {item.title}</span>
                      <span className="text-xs text-slate-500">{unlocked ? "已解锁" : "待解锁"}</span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-slate-500">{item.summary}</div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <Card title={activeModule.title}>
          {!canOpenActive ? (
            <Empty>先完成上一节小测，再解锁本节。</Empty>
          ) : (
            <div className="grid gap-5">
              <section className="rounded-md bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-950">学习目标</div>
                <p className="mt-2 text-sm leading-7 text-slate-700">{activeModule.summary}</p>
              </section>

              <section className="grid gap-3 md:grid-cols-3">
                {activeModule.core.map((item) => (
                  <div key={item} className="rounded-md border border-slate-200 p-3 text-sm leading-6 text-slate-700">
                    {item}
                  </div>
                ))}
              </section>

              <section className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm leading-7 text-emerald-950">
                  <div className="font-medium">生活例子</div>
                  <div className="mt-1">{activeModule.example}</div>
                </div>
                <div className="rounded-md border border-amber-100 bg-amber-50 p-3 text-sm leading-7 text-amber-950">
                  <div className="font-medium">高频易错点</div>
                  <div className="mt-1">{activeModule.pitfall}</div>
                </div>
              </section>

              <section className="grid gap-3">
                <div className="flex items-center gap-2 font-medium text-slate-950">
                  <ListChecks className="h-4 w-4" />
                  3题小测
                </div>
                {activeModule.quiz.map((item, index) => {
                  const key = `${activeModule.id}-${index}`;
                  return (
                    <div key={item.question} className="rounded-md border border-slate-200 p-3">
                      <div className="text-sm font-medium text-slate-950">{index + 1}. {item.question}</div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {item.options.map((option, optionIndex) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setQuizAnswers((current) => ({ ...current, [key]: optionIndex }))}
                            className={cn(
                              "rounded-md border px-3 py-2 text-left text-sm",
                              quizAnswers[key] === optionIndex ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700",
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      {quizScore !== null && (
                        <div className={`mt-2 text-xs ${quizAnswers[key] === item.answer ? "text-emerald-700" : "text-rose-700"}`}>
                          {item.explain}
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button
                  type="button"
                  className="w-fit"
                  disabled={activeModule.quiz.some((_item, index) => quizAnswers[`${activeModule.id}-${index}`] === undefined)}
                  onClick={submitQuiz}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  提交小测并尝试解锁
                </Button>
                {quizScore !== null && (
                  <div className={`rounded-md p-3 text-sm ${quizScore >= 2 ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                    小测得分：{quizScore}/{activeModule.quiz.length}。
                    {quizScore >= 2 ? "已解锁下一节。" : "建议重看核心概念和易错点后再试。"}
                  </div>
                )}
              </section>

              <section className="rounded-md border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-950">挑战问题</div>
                <p className="mt-2 text-sm leading-7 text-slate-700">{activeModule.challenge}</p>
                <textarea className={`${textareaClass} mt-3`} placeholder="写一句自己的解释。DEMO阶段会先记录到学习行为，后续可接入AI评价。" onBlur={(event) => event.target.value && logInteraction("advanced_chemistry_challenge", `${activeModule.title}: ${event.target.value}`)} />
              </section>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

type ChemistryCoachProfile = {
  goal: string;
  baseline: string;
  interest: string;
  textbook: string;
  materialName: string;
  level: "fast" | "steady" | "foundation";
  todayTopic: ChemistryModule;
  teachingStyle: string;
  aiJudgement: string;
  tutorSignal: string;
};

type ChemistryCoachMessage = {
  role: "student" | "ai";
  content: string;
};

function chooseChemistryTopic(interest: string, baseline: string) {
  if (interest.includes("实验")) return chemistryModules[2];
  if (interest.includes("符号")) return chemistryModules[4];
  if (baseline.includes("强")) return chemistryModules[1];
  return chemistryModules[0];
}

function buildChemistryCoachProfile(input: {
  goal: string;
  baseline: string;
  interest: string;
  textbook: string;
  materialName: string;
}) {
  const todayTopic = chooseChemistryTopic(input.interest, input.baseline);
  const level: ChemistryCoachProfile["level"] = input.baseline.includes("强")
    ? "fast"
    : input.baseline.includes("一般")
      ? "steady"
      : "foundation";
  const teachingStyle =
    level === "fast"
      ? "少讲定义，多用反例和迁移问题检验理解。"
      : level === "steady"
        ? "先用生活现象建立概念，再用一道判断题校准理解。"
        : "降低抽象度，先训练观察现象和证据表达。";
  return {
    ...input,
    level,
    todayTopic,
    teachingStyle,
    aiJudgement:
      level === "fast"
        ? "适合进入初三化学超前学习，但不宜一开始大量背符号，应先建立证据意识和变化判断。"
        : level === "steady"
          ? "适合用短课推进，每次只引入一个核心概念，并让学生用自己的话复述。"
          : "建议先做低门槛预热，不急着进入化学式和方程式。AI会优先检查现象、证据和概念边界。",
    tutorSignal:
      level === "foundation"
        ? "督学需要关注学生是否把现象和结论混在一起。"
        : "督学可重点观察学生能否主动说明判断依据，而不是只说答案。",
  };
}

function generateChemistryAnswer(question: string, profile: ChemistryCoachProfile) {
  const normalized = question.trim();
  if (normalized.includes("为什么") || normalized.includes("区别")) {
    return `我先不直接给你背定义。以「${profile.todayTopic.title}」为例，判断的关键不是看表面热闹不热闹，而是找证据：有没有新物质、现象能不能支持结论、是否需要进一步验证。你的问题可以这样拆：第一步写出看见的现象，第二步判断这些现象支持哪个结论，第三步找一个反例检查。`;
  }
  if (normalized.includes("化学式") || normalized.includes("元素") || normalized.includes("符号")) {
    return "符号类内容不要靠硬背开始。先记住：元素符号表示元素，右下角数字表示一个微粒中的原子个数，前面的系数表示微粒个数。AI建议你先用 H2O、CO2、O2 三个例子建立读法，再进入化合价。";
  }
  if (normalized.includes("实验") || normalized.includes("现象")) {
    return "实验题要按「操作-现象-结论」写。现象必须是眼睛、鼻子或仪器直接得到的信息，结论是基于现象推出来的判断。你可以先回答：我看到了什么？这个现象能证明什么？还有没有别的可能？";
  }
  return `我会按你的画像来回答：${profile.teachingStyle} 当前问题先抓一个核心点：化学不是记零散事实，而是用证据解释物质变化。你可以先写一句自己的判断依据，我再帮你判断它是“现象”“结论”还是“证据不足”。`;
}

function evaluateChemistryReflection(text: string, profile: ChemistryCoachProfile) {
  const score =
    (text.includes("现象") ? 1 : 0) +
    (text.includes("证据") ? 1 : 0) +
    (text.includes("新物质") ? 1 : 0) +
    (text.includes("结论") ? 1 : 0);
  if (score >= 3) {
    return {
      level: "理解较好",
      report: `学生已经能围绕「${profile.todayTopic.title}」使用现象、证据和结论来表达理解。下一步可以提高问题难度，加入反例判断或跨章节迁移。`,
    };
  }
  if (score >= 1) {
    return {
      level: "部分理解",
      report: `学生开始接触「${profile.todayTopic.title}」的核心概念，但表达中证据链还不完整。建议AI继续追问“你看到的现象是什么”和“这个现象能不能证明结论”。`,
    };
  }
  return {
    level: "需要降阶",
    report: `学生目前更像是在凭直觉回答。建议回到生活例子，不急于推进新内容，先训练把观察到的现象说清楚。${profile.tutorSignal}`,
  };
}

type ActiveLearningProfile = {
  topic: string;
  stage: string;
  purpose: string;
  priorKnowledge: string;
  map: string[];
  questionTips: string[];
  task: string;
};

type ActiveLearningMessage = {
  role: "student" | "ai";
  content: string;
  score?: number;
  improvedQuestion?: string;
  followUps?: string[];
};

type AcademicSubject = "数学" | "物理" | "化学" | "学术英语" | "通用学习";

type AcademicTask = "帮我预习" | "帮我复习" | "帮我解释" | "帮我总结" | "检查理解";

type AcademicMessage = {
  role: "student" | "ai";
  content: string;
  label?: string;
};

const academicSubjects: Array<{
  value: AcademicSubject;
  title: string;
  note: string;
}> = [
  { value: "数学", title: "数学", note: "公式来源、步骤拆解、变式验证" },
  { value: "物理", title: "物理", note: "情境建模、变量关系、单位检查" },
  { value: "化学", title: "化学", note: "概念边界、现象证据、方程式规范" },
  { value: "学术英语", title: "学术英语", note: "证据定位、句法结构、学术表达" },
  { value: "通用学习", title: "通用学习", note: "材料梳理、笔记总结、理解检查" },
];

const academicTasks: AcademicTask[] = ["帮我预习", "帮我复习", "帮我解释", "帮我总结", "检查理解"];

function buildAcademicMethod(subject: AcademicSubject) {
  const methods: Record<
    AcademicSubject,
    {
      focus: string;
      validation: string;
      warning: string;
      followUps: string[];
    }
  > = {
    数学: {
      focus: "先确认概念和公式的适用条件，再拆步骤，最后用一道变式题检查是否真的会用。",
      validation: "请你独立写出每一步为什么成立，并让AI只检查逻辑断点，不直接代写答案。",
      warning: "不要只问答案。数学学习要让AI解释公式来源、条件和易错步骤。",
      followUps: ["这个公式什么时候不能用？", "请给我一道同类型但条件变化的题。", "我这一步推导有没有逻辑跳跃？"],
    },
    物理: {
      focus: "先把题目或材料转成物理情境，列出已知量、未知量、单位和变量关系。",
      validation: "请你用单位检查、极端情况和图像/受力/过程分析验证结论。",
      warning: "物理不能只套公式。要让AI追问对象、过程、条件和单位。",
      followUps: ["这个情境中哪些量是不变的？", "如果条件改变，结论会怎样变？", "请帮我做一次单位检查。"],
    },
    化学: {
      focus: "先区分现象、证据和结论，再看概念边界、反应条件和表达规范。",
      validation: "请你用一个生活现象或实验现象解释概念，并说明证据是否足够支持结论。",
      warning: "化学不要只背结论。要让AI说明现象依据、反例和适用范围。",
      followUps: ["这个结论的实验依据是什么？", "有没有容易混淆的相近概念？", "请指出方程式或符号表达是否规范。"],
    },
    学术英语: {
      focus: "先定位原文证据句，再分析句法结构、指代关系和学术表达，不使用口语俚语。",
      validation: "请你用原文证据支持答案，并让AI指出证据句、关键词和语法结构。",
      warning: "英语反馈必须严谨。不要让AI给口语化解释，要要求证据、结构和正式表达。",
      followUps: ["请标出原文证据句。", "这个长难句的主干和修饰成分是什么？", "请把我的表达改成正式学术英语。"],
    },
    通用学习: {
      focus: "先把材料拆成概念、例子、问题和结论，再生成可执行的学习步骤。",
      validation: "请你用自己的话复述，并让AI给一个能验证理解的小任务。",
      warning: "通用学习也要避免泛泛而谈。要让AI给依据、步骤、例子和检查标准。",
      followUps: ["这段材料最核心的三个概念是什么？", "请给我一个能验证理解的小任务。", "我应该先学什么，暂时跳过什么？"],
    },
  };
  return methods[subject];
}

function buildAcademicResponse(input: {
  subject: AcademicSubject;
  task: AcademicTask;
  material: string;
  goal: string;
}) {
  const method = buildAcademicMethod(input.subject);
  const materialPreview = input.material.trim().slice(0, 90);
  const taskGuide: Record<AcademicTask, string> = {
    帮我预习: "先建立入门框架，不急着做难题；把陌生词、核心概念和第一个例子讲清楚。",
    帮我复习: "先找出已经学过但不稳定的部分，再用小题或复述检查薄弱点。",
    帮我解释: "围绕学生贴出的材料逐段解释，优先讲清楚因果、条件和边界。",
    帮我总结: "把材料压缩成可复习笔记，保留概念、例子、易错点和检查问题。",
    检查理解: "不直接讲新内容，先用追问、小任务和反例判断学生是不是真的理解。",
  };

  return [
    `学习任务：${input.subject} · ${input.task}`,
    `目标：${input.goal || "把当前材料学懂，并能自己复述重点。"}`,
    "",
    "1. 先定位本次材料",
    materialPreview ? `我会先围绕你提供的材料开讲：${materialPreview}${input.material.length > 90 ? "..." : ""}` : "你还没有提供具体材料，可以先粘贴教材、笔记、作业要求或阅读文本。",
    "",
    "2. 本次学习方法",
    taskGuide[input.task],
    method.focus,
    "",
    "3. AI素养提醒",
    method.warning,
    "向AI提问时要给出年级、材料、目标和希望输出的形式；对AI答案要追问依据、反例和验证方法。",
    "",
    "4. 理解验证",
    method.validation,
  ].join("\n");
}

function buildAcademicEvidence(input: {
  subject: AcademicSubject;
  task: AcademicTask;
  material: string;
  goal: string;
  messages: AcademicMessage[];
}) {
  const studentTurns = input.messages.filter((item) => item.role === "student").length;
  return [
    `科目：${input.subject}`,
    `任务：${input.task}`,
    `学习目标：${input.goal || "未填写"}`,
    `材料长度：约 ${input.material.trim().length} 字`,
    `学生追问次数：${Math.max(0, studentTurns - 1)} 次`,
    "督学观察点：学生是否能带着材料、目标和验证要求向AI提问，而不是只要现成答案。",
  ].join("\n");
}

function buildAcademicFollowUpResponse(question: string, subject: AcademicSubject, task: AcademicTask) {
  const method = buildAcademicMethod(subject);
  return [
    `我会按“${subject} · ${task}”继续处理这个问题。`,
    "",
    "先把你的问题变得更可学习：",
    `你可以追问：${question}`,
    "",
    "我的反馈方式：",
    method.focus,
    "",
    "下一步请你做一件事：",
    method.validation,
  ].join("\n");
}

function AcademicAssistantLab({ logInteraction }: { logInteraction: (interactionType: string, content?: string, wrongQuestionId?: string) => void }) {
  const [subject, setSubject] = useState<AcademicSubject>("数学");
  const [task, setTask] = useState<AcademicTask>("帮我预习");
  const [material, setMaterial] = useState("例如：今天课堂讲了一次函数，我不太清楚斜率、截距和图像之间的关系。");
  const [goal, setGoal] = useState("我想先听懂核心概念，再知道怎样验证自己真的理解。");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<AcademicMessage[]>([]);
  const [evidence, setEvidence] = useState("");
  const method = buildAcademicMethod(subject);

  function startSession() {
    const nextMessages: AcademicMessage[] = [
      {
        role: "student",
        label: "学习任务",
        content: `科目：${subject}\n任务：${task}\n目标：${goal}\n材料：${material}`,
      },
      {
        role: "ai",
        label: "AI学习助手",
        content: buildAcademicResponse({ subject, task, material, goal }),
      },
    ];
    setMessages(nextMessages);
    setEvidence(buildAcademicEvidence({ subject, task, material, goal, messages: nextMessages }));
    logInteraction("academic_assistant_session", `${subject}; ${task}; ${goal}; ${material.slice(0, 120)}`);
  }

  function askFollowUp(nextQuestion?: string) {
    const content = (nextQuestion || question).trim();
    if (!content) return;
    const nextMessages: AcademicMessage[] = [
      ...messages,
      { role: "student", label: "学生追问", content },
      { role: "ai", label: "AI反馈", content: buildAcademicFollowUpResponse(content, subject, task) },
    ];
    setMessages(nextMessages);
    setEvidence(buildAcademicEvidence({ subject, task, material, goal, messages: nextMessages }));
    setQuestion("");
    logInteraction("academic_assistant_follow_up", `${subject}; ${task}; ${content}`);
  }

  return (
    <div className="grid gap-6">
      <Card
        title="AI学业助手"
        action={<span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">真实学业任务</span>}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="text-sm leading-7 text-slate-700">
            学生把教材片段、课堂笔记、作业要求或英语文本贴进来，AI不只是给答案，而是带着学生完成预习、复习、解释、总结和理解验证。
          </div>
          <div className="rounded-md border border-emerald-100 bg-emerald-50 p-4 text-sm leading-7 text-emerald-950">
            <div className="font-medium">第一版目标</div>
            <div className="mt-1">用AI辅助真实学习任务，同时训练学生提出具体问题、要求依据、验证答案和整理学习证据。</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr_340px]">
        <Card title="学习输入">
          <div className="grid gap-4">
            <Field label="选择科目">
              <div className="grid gap-2">
                {academicSubjects.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSubject(item.value)}
                    className={cn(
                      "rounded-md border px-3 py-3 text-left transition",
                      subject === item.value ? "border-emerald-400 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-white hover:border-emerald-200",
                    )}
                  >
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.note}</div>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="学习任务">
              <div className="grid grid-cols-2 gap-2">
                {academicTasks.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTask(item)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-medium transition",
                      task === item ? "border-emerald-500 bg-emerald-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200",
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="粘贴学习材料">
              <textarea value={material} onChange={(event) => setMaterial(event.target.value)} className={textareaClass} rows={7} />
            </Field>

            <Field label="本次学习目标">
              <textarea value={goal} onChange={(event) => setGoal(event.target.value)} className={textareaClass} rows={4} />
            </Field>

            <Button type="button" onClick={startSession}>
              <Sparkles className="h-4 w-4" />
              开始AI辅助学习
            </Button>
          </div>
        </Card>

        <Card title="AI学习过程">
          {messages.length === 0 ? (
            <Empty>先选择科目和任务，粘贴真实学习材料，再点击开始。AI会围绕材料生成学习步骤，而不是只给搜索式答案。</Empty>
          ) : (
            <div className="grid gap-4">
              <div className="max-h-[560px] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3">
                  {messages.map((item, index) => (
                    <div
                      key={`${item.role}-${index}`}
                      className={cn(
                        "rounded-md p-4 text-sm leading-7 whitespace-pre-line",
                        item.role === "student" ? "bg-emerald-700 text-white" : "bg-white text-slate-700",
                      )}
                    >
                      <div className={cn("mb-1 text-xs font-medium", item.role === "student" ? "text-emerald-100" : "text-slate-500")}>
                        {item.label || (item.role === "student" ? "学生" : "AI")}
                      </div>
                      {item.content}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  className={textareaClass}
                  rows={4}
                  placeholder="继续追问。建议带上：我哪里没懂、希望AI用什么例子、想怎样验证理解。"
                />
                <Button type="button" onClick={() => askFollowUp()} disabled={messages.length === 0 || !question.trim()}>
                  <Sparkles className="h-4 w-4" />
                  追问并获得反馈
                </Button>
              </div>
            </div>
          )}
        </Card>

        <div className="grid gap-6">
          <Card title="追问建议">
            <div className="grid gap-2">
              {method.followUps.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => askFollowUp(item)}
                  disabled={messages.length === 0}
                  className="rounded-md border border-slate-200 bg-white px-3 py-3 text-left text-sm leading-6 text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {item}
                </button>
              ))}
            </div>
          </Card>

          <Card title="AI素养提示">
            <div className="grid gap-3 text-sm leading-7 text-slate-700">
              <div className="rounded-md bg-slate-50 p-3">
                提问时要给AI上下文：年级、材料、目标、输出形式。
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                不直接照抄AI答案，要追问依据、反例和验证方法。
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                最后用自己的话总结，交给督学看学习证据。
              </div>
            </div>
          </Card>

          <Card title="学习证据">
            {evidence ? <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm leading-7 text-slate-700">{evidence}</pre> : <Empty>开始学习后自动生成。</Empty>}
          </Card>
        </div>
      </div>
    </div>
  );
}

function buildActiveLearningProfile(input: {
  topic: string;
  stage: string;
  purpose: string;
  priorKnowledge: string;
}) {
  const topic = input.topic.trim() || "人工智能专业探索";
  const isMajor = input.stage.includes("专业") || /专业|大学|职业|就业/.test(topic);
  const isSkill = /Python|编程|剪辑|写作|英语|技能|项目/i.test(topic);
  const map = isMajor
    ? ["这个方向解决什么问题", "大学通常学习哪些课程", "高中阶段需要哪些基础", "适合什么样的学生", "可以做一个小项目验证兴趣"]
    : isSkill
      ? ["这个技能能用来做什么", "最小入门概念", "第一周练习路径", "常见卡点", "一个可交付小作品"]
      : ["核心概念", "入门路径", "典型例子", "常见误区", "下一步可验证任务"];
  const questionTips = [
    `把“${topic}难不难”改成“${topic}入门最先遇到的3个难点是什么？”`,
    "提问时带上自己的年级、基础和目标。",
    "每次追问都要求AI给例子、边界条件或可验证任务。",
  ];
  return {
    topic,
    stage: input.stage,
    purpose: input.purpose,
    priorKnowledge: input.priorKnowledge,
    map,
    questionTips,
    task: isMajor
      ? `让AI列出${topic}的大一课程，并标记每门课对应的高中基础。`
      : isSkill
        ? `让AI设计一个2小时内能完成的${topic}小作品。`
        : `让AI用一个生活例子解释${topic}，再让它给出一个反例。`,
  } satisfies ActiveLearningProfile;
}

function scoreQuestion(question: string) {
  let score = 1;
  if (question.length >= 18) score += 1;
  if (/我|我是|年级|基础|目标|想/.test(question)) score += 1;
  if (/具体|哪些|如何|为什么|例子|区别|步骤|标准|适合/.test(question)) score += 1;
  if (/验证|项目|练习|准备|课程|路径|下一步/.test(question)) score += 1;
  return Math.min(5, score);
}

function coachActiveQuestion(question: string, profile: ActiveLearningProfile, focus = profile.topic): ActiveLearningMessage {
  const score = scoreQuestion(question);
  const improvedQuestion =
    score >= 4
      ? question
      : `我是${profile.stage}学生，想了解「${profile.topic}」。我目前${profile.priorKnowledge || "基础不多"}，目标是${profile.purpose}。请用3个核心概念、2个例子和1个可验证小任务帮我入门。`;
  return {
    role: "ai",
    score,
    improvedQuestion,
    followUps: [
      "这个主题最容易被初学者误解的地方是什么？",
      "如果我只有一周时间，应该先学什么、先不学什么？",
      "请给我一个能验证自己是否真的理解的小任务。",
    ],
    content:
      score >= 4
        ? `本节学习：${focus}。我会先围绕「${profile.topic}」给你一个入门理解：第一，先弄清这个方向在解决什么真实问题；第二，看一个具体例子，避免只记抽象名词；第三，用一个小任务验证你是否真的理解。你刚才的问题已经包含了学段、基础、目标和输出要求，所以AI更容易给出可学习的答案。`
        : `本节学习：${focus}。先给你一个入门框架：它属于「${profile.topic}」里的一个关键方向，学习时不要只问“是什么”，还要追问“解决什么问题、有什么例子、我怎么验证自己懂了”。你的问题还可以更具体，右侧有一版更好的问法，可以继续追问。`,
  };
}

function buildActiveLearningReport(profile: ActiveLearningProfile, messages: ActiveLearningMessage[], reflection: string) {
  const studentQuestions = messages.filter((item) => item.role === "student");
  const aiScores = messages.filter((item) => item.score);
  const avgScore = aiScores.length ? aiScores.reduce((sum, item) => sum + (item.score || 0), 0) / aiScores.length : 0;
  const level = avgScore >= 4 ? "提问能力较好" : avgScore >= 2.5 ? "提问能力发展中" : "需要示范提问";
  return [
    `主题：${profile.topic}`,
    `学习目的：${profile.purpose}`,
    `学生共提出 ${studentQuestions.length} 个问题，平均问题质量 ${avgScore ? avgScore.toFixed(1) : "未评分"}/5。`,
    `AI判断：${level}。`,
    reflection ? `学生总结：${reflection}` : "学生暂未提交总结。",
    `下一步建议：围绕“例子、边界、验证任务”继续追问，不只问答案。`,
  ].join("\n");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ActiveLearningLab({ logInteraction }: { logInteraction: (interactionType: string, content?: string, wrongQuestionId?: string) => void }) {
  const [topic, setTopic] = useState("我想了解人工智能专业到底学什么");
  const [stage, setStage] = useState("高中 / 专业探索");
  const [purpose, setPurpose] = useState("判断自己是否感兴趣，并知道现在该准备什么");
  const [priorKnowledge, setPriorKnowledge] = useState("会一点数学，编程基础很少");
  const [profile, setProfile] = useState<ActiveLearningProfile | null>(null);
  const [activeMapIndex, setActiveMapIndex] = useState(0);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ActiveLearningMessage[]>([]);
  const [reflection, setReflection] = useState("");
  const [report, setReport] = useState("");
  const questionInputRef = useRef<HTMLTextAreaElement | null>(null);

  const latestCoach = [...messages].reverse().find((item) => item.role === "ai" && item.score);

  function buildMapStepQuestion(nextProfile: ActiveLearningProfile, mapItem: string, index: number) {
    const outputRequest =
      index === 0
        ? "请用3个要点说明它解决什么问题，并各给一个真实例子。"
        : index === nextProfile.map.length - 1
          ? "请给我一个30分钟内能完成的小任务，用来验证我是否真的理解。"
          : "请按“概念解释、具体例子、我可以继续追问的问题”三部分回答。";

    return `我是${nextProfile.stage}学生，正在探索「${nextProfile.topic}」。我目前${nextProfile.priorKnowledge || "基础不多"}，目标是${nextProfile.purpose}。请围绕「${mapItem}」带我入门，${outputRequest}`;
  }

  function selectMapStep(index: number) {
    if (!profile) return;
    const mapItem = profile.map[index];
    const nextQuestion = buildMapStepQuestion(profile, mapItem, index);
    const coach = coachActiveQuestion(nextQuestion, profile, mapItem);
    setActiveMapIndex(index);
    setQuestion("");
    setMessages((current) => [...current, { role: "student", content: nextQuestion }, coach]);
    setReport("");
    window.setTimeout(() => {
      questionInputRef.current?.focus();
    }, 0);
    logInteraction("active_learning_map_step", `${profile.topic}: ${index + 1}. ${mapItem}`);
  }

  function generateMap() {
    const next = buildActiveLearningProfile({ topic, stage, purpose, priorKnowledge });
    const firstQuestion = buildMapStepQuestion(next, next.map[0], 0);
    const firstCoach = coachActiveQuestion(firstQuestion, next, next.map[0]);
    setProfile(next);
    setActiveMapIndex(0);
    setQuestion("");
    setMessages([
      {
        role: "ai",
        content: `入门地图已生成。我先带你学习第1个方向；学完后，你可以继续点击左侧第2、第3个方向推进。`,
      },
      { role: "student", content: firstQuestion },
      firstCoach,
    ]);
    setReport("");
    logInteraction("active_learning_map", `${next.stage}; ${next.topic}; ${next.purpose}`);
  }

  function askQuestion(nextQuestion?: string) {
    if (!profile) return;
    const content = (nextQuestion || question).trim();
    if (!content) return;
    const coach = coachActiveQuestion(content, profile, profile.map[activeMapIndex]);
    setMessages((current) => [...current, { role: "student", content }, coach]);
    setQuestion("");
    setReport("");
    logInteraction("active_learning_question", `${profile.topic}: ${content}`);
  }

  function generateReport() {
    if (!profile) return;
    const nextReport = buildActiveLearningReport(profile, messages, reflection);
    setReport(nextReport);
    logInteraction("active_learning_report", nextReport);
  }

  return (
    <div className="grid gap-6">
      <Card title="AI主动学习舱" action={<span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">提问力训练</span>}>
        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="grid gap-3 text-sm leading-7 text-slate-700">
            <p>
              这里不是固定课程，也不是拍照搜答案。学生选择一个想探索的新主题，AI帮助建立入门地图，并训练学生把模糊问题问清楚、问具体、问到可验证。
            </p>
            <div className="rounded-md border border-emerald-100 bg-emerald-50 p-4 text-emerald-950">
              <div className="font-medium">训练目标</div>
              <div className="mt-1">学会向AI说明背景、限定范围、要求例子、继续追问，并最终形成自己的学习总结。</div>
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-4 text-sm leading-7 text-slate-700">
            <div className="font-medium text-slate-950">适用场景</div>
            <div className="mt-2 grid gap-2">
              <div>高中生探索大学专业：人工智能、医学、经济学、心理学。</div>
              <div>初中生提前理解新学科：物理、化学、编程。</div>
              <div>任何学生学习新技能：Python、写作、演讲、数据分析。</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr_320px]">
        <div className="grid gap-6">
          <Card title="操作步骤">
            <div className="grid gap-3 text-sm leading-6 text-slate-700">
              {[
                "先填写学习目标，生成入门地图。",
                "点击地图里的一个方向，直接开始这一节入门学习。",
                "学习过程中看AI示范的追问方式，再用自己的问题继续问。",
                "学完后写一句总结，生成督学观察报告。",
              ].map((item, index) => (
                <div key={item} className="flex gap-3 rounded-md border border-slate-200 bg-white p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700">{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="学习目标">
            <div className="grid gap-3">
              <Field label="我想探索什么">
                <textarea className={textareaClass} value={topic} onChange={(event) => setTopic(event.target.value)} />
              </Field>
              <Field label="当前学段">
                <select className={inputClass} value={stage} onChange={(event) => setStage(event.target.value)}>
                  <option>初中 / 兴趣探索</option>
                  <option>高中 / 专业探索</option>
                  <option>高中 / 技能学习</option>
                  <option>大学前准备</option>
                </select>
              </Field>
              <Field label="学习目的">
                <textarea className={textareaClass} value={purpose} onChange={(event) => setPurpose(event.target.value)} />
              </Field>
              <Field label="我已经知道什么">
                <textarea className={textareaClass} value={priorKnowledge} onChange={(event) => setPriorKnowledge(event.target.value)} />
              </Field>
              <Button type="button" onClick={generateMap}>
                <Sparkles className="h-4 w-4" />
                生成入门地图
              </Button>
            </div>
          </Card>

          <Card title="AI入门地图">
            {!profile ? (
              <Empty>先生成入门地图。AI会把主题拆成可学习、可追问的几个方向。</Empty>
            ) : (
              <div className="grid gap-3">
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                  点击下面任意一个方向，AI会直接带你学这一节；提问方法会在学习过程中顺带训练。
                </div>
                {profile.map.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => selectMapStep(index)}
                    className={cn(
                      "rounded-md border p-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-200",
                      activeMapIndex === index ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-medium text-slate-950">{index + 1}. {item}</div>
                      <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs text-emerald-700">
                        {activeMapIndex === index ? "当前学习" : "开始学习"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs leading-5 text-slate-500">点这里，进入这一节的入门讲解和追问示范。</div>
                  </button>
                ))}
                <div className="rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                  <div className="font-medium">今日小任务</div>
                  <div>{profile.task}</div>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="grid gap-6">
          <Card title="AI学习对话">
            <div className="grid gap-3">
              {profile && (
                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
                  当前学习：{activeMapIndex + 1}. {profile.map[activeMapIndex]}。先跟着AI讲解理解知识，再用下面输入框继续追问。
                </div>
              )}
              <div className="max-h-[480px] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3">
                {!profile ? (
                  <div className="text-sm text-slate-500">生成入门地图后开始提问。</div>
                ) : (
                  <div className="grid gap-3">
                    {messages.map((item, index) => (
                      <div key={`${item.role}-${index}`} className={cn("rounded-md p-3 text-sm leading-7", item.role === "ai" ? "bg-white text-slate-700" : "bg-emerald-600 text-white")}>
                        <div className="mb-1 text-xs opacity-70">{item.role === "ai" ? "AI学习教练" : "学生"}</div>
                        {item.content}
                        {item.score && <div className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">问题质量：{item.score}/5</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <textarea
                ref={questionInputRef}
                className={textareaClass}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="试着问AI一个问题。最好带上你的年级、基础、目标和希望AI输出的形式。"
              />
              <Button type="button" disabled={!profile || !question.trim()} onClick={() => askQuestion()}>
                <Sparkles className="h-4 w-4" />
                继续追问
              </Button>
            </div>
          </Card>

          <Card title="学习总结">
            <div className="grid gap-3">
              <textarea className={textareaClass} value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="用自己的话总结：今天我理解了什么？我下次还想问什么？" />
              <Button type="button" disabled={!profile} onClick={generateReport}>
                <BookOpenCheck className="h-4 w-4" />
                生成督学观察报告
              </Button>
              {report && <pre className="whitespace-pre-wrap rounded-md bg-emerald-50 p-3 text-sm leading-7 text-emerald-950">{report}</pre>}
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card title="本节追问提示">
            {!latestCoach ? (
              <Empty>点击左侧地图方向后，这里会显示本节应该怎样追问AI。</Empty>
            ) : (
              <div className="grid gap-3 text-sm">
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">这次提问清晰度</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-950">{latestCoach.score}/5</div>
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="font-medium text-slate-950">可以这样继续问</div>
                  <div className="mt-2 leading-6 text-slate-700">{latestCoach.improvedQuestion}</div>
                  <Button type="button" className="mt-3 w-full" variant="secondary" onClick={() => latestCoach.improvedQuestion && askQuestion(latestCoach.improvedQuestion)}>
                    用这个问题追问
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card title="下一步学习问题">
            {!latestCoach?.followUps ? (
              <Empty>开始学习后，AI会给出更基础、更深入、更行动导向的追问。</Empty>
            ) : (
              <div className="grid gap-2">
                {latestCoach.followUps.map((item) => (
                  <button key={item} type="button" onClick={() => askQuestion(item)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm leading-6 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50">
                    {item}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ChemistryCoachLab({ logInteraction }: { logInteraction: (interactionType: string, content?: string, wrongQuestionId?: string) => void }) {
  const [goal, setGoal] = useState("想提前建立化学优势");
  const [baseline, setBaseline] = useState("数学和物理基础较强");
  const [interest, setInterest] = useState("喜欢实验和生活现象");
  const [textbook, setTextbook] = useState("暂不确定教材版本");
  const [materialName, setMaterialName] = useState("");
  const [profile, setProfile] = useState<ChemistryCoachProfile | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChemistryCoachMessage[]>([]);
  const [reflection, setReflection] = useState("");
  const [evaluation, setEvaluation] = useState<{ level: string; report: string } | null>(null);

  const suggestedRoute = useMemo(() => {
    if (!profile) return chemistryModules.slice(0, 4);
    const rest = chemistryModules.filter((item) => item.id !== profile.todayTopic.id);
    return [profile.todayTopic, ...rest].slice(0, 5);
  }, [profile]);

  function generateProfile() {
    const nextProfile = buildChemistryCoachProfile({ goal, baseline, interest, textbook, materialName });
    setProfile(nextProfile);
    setMessages([
      {
        role: "ai",
        content: `我会从「${nextProfile.todayTopic.title}」开始，而不是按固定关卡推进。原因是：${nextProfile.aiJudgement}`,
      },
    ]);
    setEvaluation(null);
    logInteraction("advanced_chemistry_ai_profile", `${goal}; ${baseline}; ${interest}; ${textbook}; material:${materialName || "none"}`);
  }

  function handleMaterial(file?: File) {
    if (!file) return;
    setMaterialName(file.name);
    logInteraction("advanced_chemistry_material_uploaded", `${file.name}; ${Math.round(file.size / 1024)}KB`);
  }

  function askAi() {
    if (!profile || !question.trim()) return;
    const answer = generateChemistryAnswer(question, profile);
    setMessages((current) => [...current, { role: "student", content: question.trim() }, { role: "ai", content: answer }]);
    logInteraction("advanced_chemistry_ai_question", question.trim());
    setQuestion("");
  }

  function evaluateReflection() {
    if (!profile || !reflection.trim()) return;
    const result = evaluateChemistryReflection(reflection, profile);
    setEvaluation(result);
    logInteraction("advanced_chemistry_ai_evaluation", `${result.level}; ${reflection.trim()}`);
  }

  return (
    <div className="grid gap-6">
      <Card
        title="AI化学预习教练"
        action={<span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">第一版限定：初三化学</span>}
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3 text-sm leading-7 text-slate-700">
            <p>
              这一版不再把超前学习做成固定闯关，而是让AI先了解学生，再动态生成学习路线、今日短课、追问和给督学看的学习证据。
            </p>
            <div className="grid gap-3 rounded-md border border-emerald-100 bg-emerald-50 p-4 text-emerald-950">
              <div className="flex items-center gap-2 font-medium">
                <Sparkles className="h-4 w-4" />
                AI工作方式
              </div>
              <div>先判断学生适合快进、稳进还是降阶，再决定讲法、例子、追问和下一步任务。</div>
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-4">
            <div className="flex items-center gap-2 font-medium text-slate-950">
              <Upload className="h-4 w-4" />
              教材适配材料
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              可上传教材目录、学校讲义或进度截图。DEMO阶段先记录文件名，后续接入教材解析和知识库检索。
            </p>
            <input className={`${inputClass} mt-3`} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(event) => handleMaterial(event.target.files?.[0])} />
            {materialName && <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">已记录：{materialName}</div>}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="grid gap-6">
          <Card title="AI学习访谈">
            <div className="grid gap-3">
              <Field label="学习目标">
                <select className={inputClass} value={goal} onChange={(event) => setGoal(event.target.value)}>
                  <option>想提前建立化学优势</option>
                  <option>对实验和自然现象感兴趣</option>
                  <option>想为中考提前打基础</option>
                  <option>家长希望先试学</option>
                </select>
              </Field>
              <Field label="当前基础">
                <select className={inputClass} value={baseline} onChange={(event) => setBaseline(event.target.value)}>
                  <option>数学和物理基础较强</option>
                  <option>理科基础一般，但愿意跟着学</option>
                  <option>基础偏弱，需要慢一点</option>
                </select>
              </Field>
              <Field label="兴趣入口">
                <select className={inputClass} value={interest} onChange={(event) => setInterest(event.target.value)}>
                  <option>喜欢实验和生活现象</option>
                  <option>喜欢推理和判断题</option>
                  <option>想提前学化学式和符号</option>
                  <option>还不知道喜欢什么</option>
                </select>
              </Field>
              <Field label="教材版本">
                <input className={inputClass} value={textbook} onChange={(event) => setTextbook(event.target.value)} placeholder="例如：人教版、沪教版、学校自编讲义" />
              </Field>
              <Button type="button" onClick={generateProfile}>
                <Sparkles className="h-4 w-4" />
                生成AI学习画像
              </Button>
            </div>
          </Card>

          <Card title="AI建议路线">
            <div className="grid gap-2">
              {suggestedRoute.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!profile) return;
                    setProfile({ ...profile, todayTopic: item });
                    setEvaluation(null);
                  }}
                  className={cn(
                    "rounded-md border px-3 py-3 text-left text-sm",
                    profile?.todayTopic.id === item.id ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-950">{index + 1}. {item.title}</span>
                    {profile?.todayTopic.id === item.id && <span className="text-xs text-emerald-700">今日主题</span>}
                  </div>
                  <div className="mt-1 line-clamp-2 text-slate-500">{item.summary}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          {!profile ? (
            <Card title="等待AI生成">
              <Empty>先完成左侧访谈。AI会根据学生目标、基础、兴趣和教材版本生成今天的预习方式。</Empty>
            </Card>
          ) : (
            <>
              <Card title="AI学习画像">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">AI判断</div>
                    <div className="mt-1 text-sm leading-6 text-slate-800">{profile.aiJudgement}</div>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">讲解策略</div>
                    <div className="mt-1 text-sm leading-6 text-slate-800">{profile.teachingStyle}</div>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">督学观察</div>
                    <div className="mt-1 text-sm leading-6 text-slate-800">{profile.tutorSignal}</div>
                  </div>
                </div>
              </Card>

              <Card title={`今日AI短课：${profile.todayTopic.title}`}>
                <div className="grid gap-4">
                  <div className="rounded-md border border-emerald-100 bg-emerald-50 p-4 text-sm leading-7 text-emerald-950">
                    <div className="font-medium">AI导入</div>
                    <div className="mt-1">
                      今天不要求背完整章节。先从一个问题开始：看到一个现象时，你怎样判断它只是状态改变，还是产生了新物质？这会决定你后面学实验、化学式和方程式是否顺畅。
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {profile.todayTopic.core.map((item) => (
                      <div key={item} className="rounded-md border border-slate-200 p-3 text-sm leading-6 text-slate-700">
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-md border border-slate-200 p-3 text-sm leading-7 text-slate-700">
                      <div className="font-medium text-slate-950">AI举例</div>
                      <div className="mt-1">{profile.todayTopic.example}</div>
                    </div>
                    <div className="rounded-md border border-amber-100 bg-amber-50 p-3 text-sm leading-7 text-amber-950">
                      <div className="font-medium">AI提醒</div>
                      <div className="mt-1">{profile.todayTopic.pitfall}</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="向AI提问">
                <div className="grid gap-3">
                  <div className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3">
                    {messages.length === 0 ? (
                      <div className="text-sm text-slate-500">你可以问：为什么水蒸发不是化学变化？氧气为什么助燃但不可燃？</div>
                    ) : (
                      <div className="grid gap-3">
                        {messages.map((item, index) => (
                          <div key={`${item.role}-${index}`} className={cn("rounded-md p-3 text-sm leading-7", item.role === "ai" ? "bg-white text-slate-700" : "bg-emerald-600 text-white")}>
                            <div className="mb-1 text-xs opacity-70">{item.role === "ai" ? "AI教练" : "学生"}</div>
                            {item.content}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <input className={inputClass} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="直接问AI一个化学问题" />
                    <Button type="button" onClick={askAi} disabled={!question.trim()}>
                      <Sparkles className="h-4 w-4" />
                      让AI回答
                    </Button>
                  </div>
                </div>
              </Card>

              <Card title="学习证据报告">
                <div className="grid gap-3">
                  <p className="text-sm leading-7 text-slate-600">
                    这里不看闯关分数，而看学生能不能说出判断依据。让学生用自己的话回答下面的问题，AI会生成给督学看的观察结论。
                  </p>
                  <div className="rounded-md border border-slate-200 p-4">
                    <div className="text-sm font-medium text-slate-950">{profile.todayTopic.challenge}</div>
                    <textarea className={`${textareaClass} mt-3`} value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="让学生用自己的话解释。重点看有没有现象、证据、结论。" />
                    <Button type="button" className="mt-3" onClick={evaluateReflection} disabled={!reflection.trim()}>
                      <BookOpenCheck className="h-4 w-4" />
                      生成AI观察报告
                    </Button>
                  </div>
                  {evaluation && (
                    <div className="rounded-md border border-emerald-100 bg-emerald-50 p-4 text-sm leading-7 text-emerald-950">
                      <div className="font-medium">AI判断：{evaluation.level}</div>
                      <div className="mt-1">{evaluation.report}</div>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
