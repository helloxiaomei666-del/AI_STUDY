import { readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { FeatureType, PlanType } from "@/generated/prisma/enums";
import { defaultPromptTemplates } from "@/lib/ai/prompts";
import { ApiError } from "@/lib/api";
import { getCurrentMonthKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { scienceSubjects } from "@/lib/subjects";
import { assertValidImageDataUrl, saveImageDataUrl } from "@/lib/uploads";

type AiCallResult = {
  text: string;
  parsed?: Record<string, unknown>;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
};

type Template = {
  systemPrompt: string;
  userPromptTemplate: string;
  modelName: string;
  temperature: Prisma.Decimal | number;
};

type AnalyzeInput = {
  storeId: string;
  userId?: string | null;
  studentId: string;
  subject: string;
  imageDataUrl?: string | null;
  studentReason?: string | null;
  extraNote?: string | null;
};

type ReanalyzeInput = {
  storeId: string;
  userId: string;
  wrongQuestionId: string;
  extraNote?: string | null;
};

type StudyPlanInput = {
  storeId: string;
  userId: string;
  studentId: string;
  planType: PlanType;
  availableMinutes: number;
  focusSubject?: string | null;
};

type DailyReportInput = {
  storeId: string;
  userId: string;
  studentId: string;
  reportDate?: string;
  studyDuration: string;
  studyContent: string;
  completionStatus: string;
  studyStatus: string;
  staffNote?: string | null;
  wrongQuestionIds?: string[];
};

function fillTemplate(template: string, values: Record<string, string | number | null | undefined>) {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{{${key}}}`, String(value ?? "")),
    template,
  );
}

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 2));
}

function extractJson(text: string): Record<string, unknown> | undefined {
  const candidate = text.trim().match(/\{[\s\S]*\}/)?.[0] ?? text.trim();
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function nextReviewDate(days = 2) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function imageMimeFromPath(imagePath: string) {
  const ext = path.extname(imagePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/png";
}

async function storedImageToModelInput(imageUrl?: string | null) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("data:image/") || imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  if (!imageUrl.startsWith("/")) return null;

  const publicPath = path.join(process.cwd(), "public", imageUrl.replace(/^\/+/, ""));
  try {
    const bytes = await readFile(publicPath);
    return `data:${imageMimeFromPath(publicPath)};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function quotaFields(featureType: FeatureType) {
  switch (featureType) {
    case "wrong_question":
      return { used: "wrongQuestionUsed", quota: "wrongQuestionQuota" } as const;
    case "study_plan":
      return { used: "studyPlanUsed", quota: "studyPlanQuota" } as const;
    case "daily_report":
      return { used: "dailyReportUsed", quota: "dailyReportQuota" } as const;
  }
}

async function getTemplate(featureType: FeatureType): Promise<Template> {
  const template = await prisma.promptTemplate.findFirst({
    where: { featureType, status: "active" },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
  });

  return template ?? defaultPromptTemplates[featureType];
}

async function assertStoreReady(storeId: string, featureType: FeatureType) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store || store.status !== "active") throw new ApiError("门店已停用或不存在", 403);
  if (store.packageExpireAt && store.packageExpireAt < new Date()) {
    throw new ApiError("门店套餐已到期", 403);
  }

  const month = getCurrentMonthKey();
  let quota = await prisma.storeQuota.findUnique({
    where: { storeId_month: { storeId, month } },
  });

  if (!quota) {
    const pkg = store.packageType
      ? await prisma.package.findFirst({ where: { name: store.packageType, status: "active" } })
      : null;

    quota = await prisma.storeQuota.create({
      data: {
        storeId,
        packageId: pkg?.id,
        month,
        wrongQuestionQuota: pkg?.wrongQuestionQuota ?? 0,
        studyPlanQuota: pkg?.studyPlanQuota ?? 0,
        dailyReportQuota: pkg?.dailyReportQuota ?? 0,
      },
    });
  }

  const fields = quotaFields(featureType);
  if (quota[fields.used] + 1 > quota[fields.quota]) {
    throw new ApiError("当前功能AI额度不足，请联系老板或平台管理员加额度", 402);
  }

  return { month };
}

async function chargeQuota(
  tx: PrismaClient | Prisma.TransactionClient,
  params: {
    storeId: string;
    userId?: string | null;
    featureType: FeatureType;
    month: string;
    ai: AiCallResult;
  },
) {
  const fields = quotaFields(params.featureType);
  await tx.storeQuota.update({
    where: { storeId_month: { storeId: params.storeId, month: params.month } },
    data: { [fields.used]: { increment: 1 } },
  });

  await tx.aiUsageLog.create({
    data: {
      storeId: params.storeId,
      userId: params.userId,
      featureType: params.featureType,
      modelName: params.ai.modelName,
      inputTokens: params.ai.inputTokens,
      outputTokens: params.ai.outputTokens,
      cost: params.ai.cost,
      chargedUnits: 1,
    },
  });
}

async function callOpenAI(params: {
  template: Template;
  userPrompt: string;
  imageDataUrl?: string | null;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || process.env.AI_PROVIDER !== "openai") return null;

  const inputContent: Array<Record<string, string>> = [{ type: "input_text", text: params.userPrompt }];
  if (params.imageDataUrl) {
    inputContent.push({ type: "input_image", image_url: params.imageDataUrl });
  }

  const requestBody: Record<string, unknown> = {
    model: params.template.modelName,
    input: [
      { role: "system", content: [{ type: "input_text", text: params.template.systemPrompt }] },
      { role: "user", content: inputContent },
    ],
  };

  if (params.template.modelName.startsWith("gpt-5")) {
    requestBody.reasoning = {
      effort: process.env.OPENAI_REASONING_EFFORT || "low",
    };
  } else {
    requestBody.temperature = Number(params.template.temperature);
  }

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: AbortSignal.timeout(Number(process.env.OPENAI_TIMEOUT_MS || 60000)),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    throw new ApiError(error instanceof Error && error.name === "TimeoutError" ? "AI调用超时，未扣减额度，请稍后重试" : "AI网络调用失败，未扣减额度", 502);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(`AI调用失败，未扣减额度。错误信息：${detail.slice(0, 500)}`, response.status >= 500 ? 502 : 400);
  }

  const data = (await response.json()) as {
    output_text?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = data.output_text || "AI未返回文本内容";
  const inputTokens = data.usage?.input_tokens ?? estimateTokens(params.template.systemPrompt + params.userPrompt);
  const outputTokens = data.usage?.output_tokens ?? estimateTokens(text);

  return {
    text,
    parsed: extractJson(text),
    modelName: params.template.modelName,
    inputTokens,
    outputTokens,
    cost: Number((inputTokens * 0.0000015 + outputTokens * 0.000006).toFixed(4)),
  } satisfies AiCallResult;
}

async function logAiFailure(params: {
  storeId: string;
  userId?: string | null;
  featureType: FeatureType;
  modelName: string;
  error: unknown;
  durationMs: number;
}) {
  const message = params.error instanceof Error ? params.error.message : "AI调用失败";
  try {
    await prisma.aiFailureLog.create({
      data: {
        storeId: params.storeId,
        userId: params.userId,
        featureType: params.featureType,
        modelName: params.modelName,
        errorMessage: message.slice(0, 2000),
        durationMs: params.durationMs,
      },
    });
  } catch (error) {
    console.error("AI failure log write failed", error);
  }
}

function mockWrongQuestion(subject: string, studentReason?: string | null): AiCallResult {
  const knowledgePointBySubject: Record<string, string> = {
    数学: "一次函数应用题",
    物理: "受力分析与运动关系",
    化学: "化学方程式与反应条件",
    英语: "学术英语语法与阅读论证",
  };
  const isEnglish = subject === "英语";
  const isChemistry = subject === "化学";
  const parsed = isEnglish
    ? {
        ocrText: "（演示识别）This item requires precise grammatical judgement and evidence-based reading analysis.",
        knowledgePoint: knowledgePointBySubject[subject],
        questionType: "Academic English analysis",
        difficulty: "中等",
        possibleReason: studentReason || "学生可能没有准确识别句法结构或文本证据，导致选项判断不够严谨。",
        hintLevel1: "First identify the sentence structure, the key predicate, and the textual evidence that directly supports the answer.",
        hintLevel2:
          "Examine whether each option is supported by explicit evidence in the passage, and eliminate choices that overgeneralize, distort causality, or use imprecise wording.",
        fullExplanation:
          "A rigorous academic-English solution should proceed in three steps: first, parse the grammatical structure and identify the controlling clause; second, locate the exact textual evidence; third, compare the wording of each option with the evidence, rejecting any option that is colloquial, unsupported, or semantically inaccurate.",
        reviewSuggestion:
          "建议2天后重新复盘本题，重点训练句法分析、词义精确性和证据定位。英语输出必须保持正式、严谨、学术化表达，不使用口语俚语。",
        similarPracticeSuggestion:
          "优先练习同类 academic reading 或 grammar items，要求每道题写出 evidence sentence 和 option elimination reason。",
        nextReviewDays: 2,
        content:
          "This item primarily assesses the student's ability to interpret academic English with grammatical precision and evidence-based reasoning. The present error appears to result from insufficient syntactic analysis or imprecise evidence matching; subsequent practice should focus on formal grammar, textual evidence, and logically defensible option elimination.",
      }
    : isChemistry
      ? {
          ocrText: "（演示识别）这是一道围绕物质变化、实验现象和判断依据的化学错题。",
          knowledgePoint: knowledgePointBySubject[subject],
          questionType: "概念辨析与证据判断题",
          difficulty: "中等",
          possibleReason: studentReason || "学生可能把实验现象和实验结论混在一起，没有抓住“是否有新物质生成”这个判断依据。",
          hintLevel1: "先写出题目中能直接观察到的现象，不要急着下结论。",
          hintLevel2: "再判断这些现象是否能支持“有新物质生成”。如果只是状态、形状或位置改变，通常不是化学变化。",
          fullExplanation:
            "完整解析建议分三步：第一，列出现象，例如颜色变化、气体产生、沉淀生成、放热发光等；第二，判断这些现象是否能证明生成了新物质；第三，用“现象-证据-结论”的格式回答。注意，发光、放热、变色本身不能单独证明化学变化，关键仍然是是否生成新物质。",
          reviewSuggestion: "建议2天后重新复盘本题，并补充3道“物理变化/化学变化/化学性质”辨析题，要求每题写出判断依据。",
          similarPracticeSuggestion: "优先练习蜡烛燃烧、铁生锈、水蒸发、食物腐败、冰融化等生活情境，训练从现象推到结论的证据链。",
          nextReviewDays: 2,
          content:
            "本题主要考察学生能否用化学视角区分现象和结论，并判断是否有新物质生成。当前错误更像是证据意识不足，建议先训练“我看到了什么、它能证明什么、是否还有别的可能”这三个问题。",
        }
    : {
        ocrText: "（演示识别）这是一道需要学生从条件中提取数量关系的错题。",
        knowledgePoint: knowledgePointBySubject[subject] || `${subject}核心知识点`,
        questionType: "应用分析题",
        difficulty: "中等",
        possibleReason: studentReason || "学生可能没有先拆解题干条件，导致关键关系判断不稳定。",
        hintLevel1: "先把题目中已知条件和要求的问题分别圈出来。",
        hintLevel2: "尝试找出两个变化量之间的关系，再判断应该使用哪一个公式或方法。",
        fullExplanation:
          "完整解析建议分三步：第一，读题并标出关键信息；第二，建立条件之间的关系；第三，代入并检查单位、符号和结论是否与题意一致。",
        reviewSuggestion: "建议2天后重新完成本题，并补充3道同类题训练。",
        similarPracticeSuggestion: "优先练习同一知识点的基础题，再做1-2道综合题。",
        nextReviewDays: 2,
        content:
          "本题主要考察学生能否从题干中提取关键信息并建立解题关系。当前错误更像是审题和关系建模不够稳定，建议先复盘题干条件，再做同类题巩固。",
      };

  return {
    text: JSON.stringify(parsed, null, 2),
    parsed,
    modelName: isEnglish ? "mock-academic-english" : isChemistry ? "mock-chemistry" : "mock-vision",
    inputTokens: 380,
    outputTokens: isEnglish ? 620 : 520,
    cost: 0.004,
  };
}

function mockText(text: string, modelName = "mock-text"): AiCallResult {
  return {
    text,
    parsed: undefined,
    modelName,
    inputTokens: estimateTokens(text) + 200,
    outputTokens: estimateTokens(text),
    cost: 0.002,
  };
}

async function callAi(params: {
  storeId: string;
  userId?: string | null;
  featureType: FeatureType;
  template: Template;
  userPrompt: string;
  imageDataUrl?: string | null;
  mockText?: string;
  mockWrongSubject?: string;
  studentReason?: string | null;
}): Promise<AiCallResult> {
  const startedAt = Date.now();
  try {
    const real = await callOpenAI(params);
    if (real) return real;
  } catch (error) {
    await logAiFailure({
      storeId: params.storeId,
      userId: params.userId,
      featureType: params.featureType,
      modelName: params.template.modelName,
      error,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }

  if (params.featureType === "wrong_question") {
    return mockWrongQuestion(params.mockWrongSubject || scienceSubjects[0], params.studentReason);
  }

  return mockText(params.mockText || "AI演示内容", params.template.modelName);
}

export const AIService = {
  async analyzeWrongQuestion(input: AnalyzeInput) {
    const featureType = "wrong_question" as const;
    const [{ month }, template, student] = await Promise.all([
      assertStoreReady(input.storeId, featureType),
      getTemplate(featureType),
      prisma.student.findFirst({ where: { id: input.studentId, storeId: input.storeId, status: "active" } }),
    ]);

    if (!student) throw new ApiError("学生不存在或不属于当前门店", 404);

    const userPrompt = fillTemplate(template.userPromptTemplate, {
      grade: student.grade,
      subject: input.subject,
      goal: student.goal,
      weak_points: student.weakPoints,
      student_reason: input.studentReason,
      extra_note: input.extraNote,
    });
    assertValidImageDataUrl(input.imageDataUrl);
    const ai = await callAi({
      storeId: input.storeId,
      userId: input.userId,
      featureType,
      template,
      userPrompt,
      imageDataUrl: input.imageDataUrl,
      mockWrongSubject: input.subject,
      studentReason: input.studentReason,
    });
    if (!ai.parsed) {
      const error = new ApiError("AI输出格式异常，未扣减额度。请重试或检查Prompt模板。", 502);
      await logAiFailure({
        storeId: input.storeId,
        userId: input.userId,
        featureType,
        modelName: ai.modelName,
        error,
        durationMs: 0,
      });
      throw error;
    }
    const parsed = ai.parsed ?? {};
    const imageUrl = await saveImageDataUrl({
      dataUrl: input.imageDataUrl,
      storeId: input.storeId,
      studentId: input.studentId,
      folder: "wrong-questions",
    });

    return prisma.$transaction(async (tx) => {
      const record = await tx.wrongQuestion.create({
        data: {
          storeId: input.storeId,
          studentId: input.studentId,
          createdById: input.userId || undefined,
          subject: input.subject,
          imageUrl,
          studentReason: input.studentReason,
          ocrText: String(parsed.ocrText ?? ""),
          knowledgePoint: String(parsed.knowledgePoint ?? ""),
          questionType: String(parsed.questionType ?? ""),
          difficulty: String(parsed.difficulty ?? ""),
          aiAnalysis: String(parsed.content ?? ai.text),
          hintLevel1: String(parsed.hintLevel1 ?? ""),
          hintLevel2: String(parsed.hintLevel2 ?? ""),
          fullExplanation: String(parsed.fullExplanation ?? ""),
          reviewSuggestion: String(parsed.reviewSuggestion ?? ""),
          nextReviewDate: nextReviewDate(Number(parsed.nextReviewDays ?? 2)),
          aiModel: ai.modelName,
          inputTokens: ai.inputTokens,
          outputTokens: ai.outputTokens,
          rawOutput: parsed as Prisma.InputJsonValue,
        },
        include: { student: true },
      });
      await chargeQuota(tx, { storeId: input.storeId, userId: input.userId, featureType, month, ai });
      return record;
    });
  },

  async reanalyzeWrongQuestion(input: ReanalyzeInput) {
    const featureType = "wrong_question" as const;
    const [{ month }, template, existing] = await Promise.all([
      assertStoreReady(input.storeId, featureType),
      getTemplate(featureType),
      prisma.wrongQuestion.findFirst({
        where: { id: input.wrongQuestionId, storeId: input.storeId },
        include: { student: true },
      }),
    ]);

    if (!existing) throw new ApiError("错题不存在或不属于当前门店", 404);

    const supplementalNote = [
      existing.ocrText ? `原题识别文本：${existing.ocrText}` : "",
      existing.aiAnalysis ? `原AI分析摘要：${existing.aiAnalysis}` : "",
      input.extraNote ? `督学重新分析要求：${input.extraNote}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const userPrompt = fillTemplate(template.userPromptTemplate, {
      grade: existing.student.grade,
      subject: existing.subject,
      goal: existing.student.goal,
      weak_points: existing.student.weakPoints,
      student_reason: existing.studentReason,
      extra_note: supplementalNote,
    });
    const imageDataUrl = await storedImageToModelInput(existing.imageUrl);
    const ai = await callAi({
      storeId: input.storeId,
      userId: input.userId,
      featureType,
      template,
      userPrompt,
      imageDataUrl,
      mockWrongSubject: existing.subject,
      studentReason: existing.studentReason,
    });
    if (!ai.parsed) {
      const error = new ApiError("AI输出格式异常，未扣减额度。请重试或检查Prompt模板。", 502);
      await logAiFailure({
        storeId: input.storeId,
        userId: input.userId,
        featureType,
        modelName: ai.modelName,
        error,
        durationMs: 0,
      });
      throw error;
    }
    const parsed = ai.parsed ?? {};

    return prisma.$transaction(async (tx) => {
      const record = await tx.wrongQuestion.update({
        where: { id: existing.id },
        data: {
          ocrText: String(parsed.ocrText ?? existing.ocrText ?? ""),
          knowledgePoint: String(parsed.knowledgePoint ?? existing.knowledgePoint ?? ""),
          questionType: String(parsed.questionType ?? existing.questionType ?? ""),
          difficulty: String(parsed.difficulty ?? existing.difficulty ?? ""),
          aiAnalysis: String(parsed.content ?? ai.text),
          hintLevel1: String(parsed.hintLevel1 ?? existing.hintLevel1 ?? ""),
          hintLevel2: String(parsed.hintLevel2 ?? existing.hintLevel2 ?? ""),
          fullExplanation: String(parsed.fullExplanation ?? existing.fullExplanation ?? ""),
          reviewSuggestion: String(parsed.reviewSuggestion ?? existing.reviewSuggestion ?? ""),
          nextReviewDate: nextReviewDate(Number(parsed.nextReviewDays ?? 2)),
          masteryStatus: existing.masteryStatus === "mastered" ? "reviewing" : existing.masteryStatus,
          aiModel: ai.modelName,
          inputTokens: ai.inputTokens,
          outputTokens: ai.outputTokens,
          rawOutput: parsed as Prisma.InputJsonValue,
        },
        include: { student: true },
      });
      await chargeQuota(tx, { storeId: input.storeId, userId: input.userId, featureType, month, ai });
      return record;
    });
  },

  async generateStudyPlan(input: StudyPlanInput) {
    const featureType = "study_plan" as const;
    const [{ month }, template, student, recentWrongQuestions] = await Promise.all([
      assertStoreReady(input.storeId, featureType),
      getTemplate(featureType),
      prisma.student.findFirst({ where: { id: input.studentId, storeId: input.storeId, status: "active" } }),
      prisma.wrongQuestion.findMany({
        where: { studentId: input.studentId, storeId: input.storeId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    if (!student) throw new ApiError("学生不存在或不属于当前门店", 404);
    const recentSummary =
      recentWrongQuestions
        .map((item) => `${item.subject}-${item.knowledgePoint || "未标注知识点"}：${item.reviewSuggestion || item.aiAnalysis}`)
        .join("\n") || "暂无历史错题，先根据学生档案安排基础复习。";

    const userPrompt = fillTemplate(template.userPromptTemplate, {
      student_name: student.name,
      grade: student.grade,
      goal: student.goal,
      weak_subjects: student.weakSubjects,
      weak_points: student.weakPoints,
      recent_wrong_questions: recentSummary,
      plan_type: input.planType === "today" ? "今日计划" : "本周计划",
      available_minutes: input.availableMinutes,
      focus_subject: input.focusSubject,
    });
    const reviewMinutes = Math.min(30, Math.max(15, Math.floor(input.availableMinutes * 0.25)));
    const practiceMinutes = Math.max(20, input.availableMinutes - reviewMinutes - 10);
    const focus = input.focusSubject || student.weakSubjects || "薄弱知识点";
    const includesEnglish = /英语|English|academic/i.test(`${focus} ${student.weakSubjects || ""} ${student.weakPoints || ""} ${recentSummary}`);
    const mainTask = includesEnglish
      ? "围绕学术英语的语法精确性、句法分析、阅读证据定位和正式表达完成复盘训练。"
      : `围绕${focus}完成错题复盘和同类训练。`;
    const practiceRequirement = includesEnglish
      ? "完成同类 academic English 练习，要求标注句法结构、证据句和选项排除理由，避免口语俚语或泛泛表达。"
      : "完成同知识点练习，重点检查审题、步骤和单位。";
    const mock = `${student.name}${input.planType === "today" ? "今日" : "本周"}学习计划

预计学习时长：${input.availableMinutes}分钟

学习目标：${mainTask}

任务一：复习最近错题
预计时间：${reviewMinutes}分钟
要求：重新读题，标出错因，并独立复述解题思路。

任务二：同类题训练
预计时间：${practiceMinutes}分钟
要求：${practiceRequirement}

任务三：今日复盘
预计时间：10分钟
要求：记录仍然不稳定的地方，交给督学下次重点跟进。`;
    const ai = await callAi({ storeId: input.storeId, userId: input.userId, featureType, template, userPrompt, mockText: mock });

    return prisma.$transaction(async (tx) => {
      const record = await tx.studyPlan.create({
        data: {
          storeId: input.storeId,
          studentId: input.studentId,
          createdById: input.userId,
          planType: input.planType,
          availableMinutes: input.availableMinutes,
          focusSubject: input.focusSubject,
          inputData: {
            studentId: input.studentId,
            recentWrongQuestionIds: recentWrongQuestions.map((item) => item.id),
            recentSummary,
          } as Prisma.InputJsonValue,
          content: ai.text,
          aiModel: ai.modelName,
          inputTokens: ai.inputTokens,
          outputTokens: ai.outputTokens,
          rawOutput: (ai.parsed ?? { text: ai.text }) as Prisma.InputJsonValue,
        },
        include: { student: true },
      });
      await chargeQuota(tx, { storeId: input.storeId, userId: input.userId, featureType, month, ai });
      return record;
    });
  },

  async generateDailyReport(input: DailyReportInput) {
    const featureType = "daily_report" as const;
    const selectedIds = input.wrongQuestionIds?.filter(Boolean) ?? [];
    const [{ month }, template, student, recentWrongQuestions] = await Promise.all([
      assertStoreReady(input.storeId, featureType),
      getTemplate(featureType),
      prisma.student.findFirst({ where: { id: input.studentId, storeId: input.storeId, status: "active" } }),
      prisma.wrongQuestion.findMany({
        where: {
          studentId: input.studentId,
          storeId: input.storeId,
          ...(selectedIds.length > 0 ? { id: { in: selectedIds } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: selectedIds.length > 0 ? selectedIds.length : 3,
      }),
    ]);

    if (!student) throw new ApiError("学生不存在或不属于当前门店", 404);
    const wrongSummary =
      recentWrongQuestions
        .map((item) => `${item.subject}${item.knowledgePoint ? `「${item.knowledgePoint}」` : ""}`)
        .join("、") || "今日暂无关联错题";

    const userPrompt = fillTemplate(template.userPromptTemplate, {
      student_name: student.name,
      grade: student.grade,
      parent_name: student.parentName || `${student.name}家长`,
      study_duration: input.studyDuration,
      study_content: input.studyContent,
      completion_status: input.completionStatus,
      study_status: input.studyStatus,
      wrong_question_summary: wrongSummary,
      staff_note: input.staffNote,
    });
    const hasEnglishContent = /英语|English|academic/i.test(`${input.studyContent} ${wrongSummary} ${input.staffNote || ""}`);
    const nextSuggestion = hasEnglishContent
      ? "建议明天先复盘今天的英语错题，重点检查语法准确性、句法结构和阅读证据定位，继续保持正式、严谨的学术英语训练。"
      : "建议明天先复盘今天的错题，再进行少量同类题训练，不急着盲目进入新内容。";
    const mock = `${student.parentName || `${student.name}家长`}您好，今天${student.name}在自习室学习了${input.studyDuration}，主要完成了${input.studyContent}。

从今天的学习情况看，孩子整体状态为${input.studyStatus}，任务完成情况是${input.completionStatus}。目前需要继续巩固的重点是${wrongSummary}，${nextSuggestion}

${input.staffNote ? `督学补充：${input.staffNote}` : "我们会继续关注孩子的错题复盘质量和学习节奏。"}`;
    const ai = await callAi({ storeId: input.storeId, userId: input.userId, featureType, template, userPrompt, mockText: mock });

    return prisma.$transaction(async (tx) => {
      const record = await tx.dailyReport.create({
        data: {
          storeId: input.storeId,
          studentId: input.studentId,
          createdById: input.userId,
          reportDate: input.reportDate ? new Date(input.reportDate) : new Date(),
          studyDuration: input.studyDuration,
          studyContent: input.studyContent,
          completionStatus: input.completionStatus,
          studyStatus: input.studyStatus,
          inputData: {
            staffNote: input.staffNote,
            wrongQuestionIds: recentWrongQuestions.map((item) => item.id),
            wrongSummary,
          } as Prisma.InputJsonValue,
          content: ai.text,
          aiModel: ai.modelName,
          inputTokens: ai.inputTokens,
          outputTokens: ai.outputTokens,
          rawOutput: (ai.parsed ?? { text: ai.text }) as Prisma.InputJsonValue,
        },
        include: { student: true },
      });
      await chargeQuota(tx, { storeId: input.storeId, userId: input.userId, featureType, month, ai });
      return record;
    });
  },
};
