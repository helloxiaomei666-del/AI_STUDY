import { z } from "zod";
import {
  getMissingPromptVariables,
  getMissingWrongQuestionJsonFields,
  promptFeatureLabels,
  type PromptFeatureType,
} from "@/lib/prompt-requirements";
import { scienceSubjects } from "@/lib/subjects";

export const dbIdSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "ID格式不正确");
export const scienceSubjectSchema = z.enum(scienceSubjects, {
  message: "当前仅支持数学、物理、化学、英语错题分析",
});

export const studentSchema = z.object({
  name: z.string().min(1, "学生姓名必填").max(100),
  grade: z.string().min(1, "年级必填").max(50),
  mainSubjects: z.string().optional().default(""),
  goal: z.string().optional().default(""),
  weakSubjects: z.string().optional().default(""),
  weakPoints: z.string().optional().default(""),
  parentName: z.string().optional().nullable(),
  parentContact: z.string().optional().nullable(),
  assignedUserId: dbIdSchema.optional().nullable(),
  remark: z.string().optional().nullable(),
});

export const analyzeWrongQuestionSchema = z.object({
  studentId: dbIdSchema,
  subject: scienceSubjectSchema,
  imageDataUrl: z.string().optional().nullable(),
  studentReason: z.string().optional().nullable(),
  extraNote: z.string().optional().nullable(),
});

export const studyPlanSchema = z.object({
  studentId: dbIdSchema,
  planType: z.enum(["today", "weekly"]),
  availableMinutes: z.coerce.number().int().min(20).max(1440),
  focusSubject: z.string().optional().nullable(),
});

export const dailyReportSchema = z.object({
  studentId: dbIdSchema,
  reportDate: z.string().optional(),
  studyDuration: z.string().min(1),
  studyContent: z.string().min(1),
  completionStatus: z.string().min(1),
  studyStatus: z.string().min(1),
  staffNote: z.string().optional().nullable(),
  wrongQuestionIds: z.array(dbIdSchema).optional().default([]),
});

export const wrongQuestionUpdateSchema = z.object({
  subject: scienceSubjectSchema.optional(),
  knowledgePoint: z.string().optional().nullable(),
  questionType: z.string().optional().nullable(),
  difficulty: z.string().optional().nullable(),
  ocrText: z.string().optional().nullable(),
  aiAnalysis: z.string().min(1).optional(),
  hintLevel1: z.string().optional().nullable(),
  hintLevel2: z.string().optional().nullable(),
  fullExplanation: z.string().optional().nullable(),
  reviewSuggestion: z.string().optional().nullable(),
  nextReviewDate: z.string().optional().nullable(),
  masteryStatus: z.enum(["not_mastered", "reviewing", "mastered", "focus"]).optional(),
});

export const reanalyzeWrongQuestionSchema = z.object({
  extraNote: z.string().optional().nullable(),
});

export const studentPortalAnalyzeSchema = z.object({
  subject: scienceSubjectSchema,
  imageDataUrl: z.string().optional().nullable(),
  studentReason: z.string().optional().nullable(),
  extraNote: z.string().optional().nullable(),
});

export const studentPortalMasterySchema = z.object({
  masteryStatus: z.enum(["not_mastered", "reviewing", "mastered", "focus"]),
  content: z.string().optional().nullable(),
});

export const studentPortalInteractionSchema = z.object({
  wrongQuestionId: dbIdSchema.optional().nullable(),
  interactionType: z.string().min(1).max(50),
  content: z.string().optional().nullable(),
});

export const promptTemplateBaseSchema = z.object({
  featureType: z.enum(["wrong_question", "study_plan", "daily_report"]),
  name: z.string().min(1),
  systemPrompt: z.string().min(1),
  userPromptTemplate: z.string().min(1),
  modelName: z.string().min(1),
  temperature: z.coerce.number().min(0).max(2),
  status: z.enum(["active", "inactive", "disabled"]).default("active"),
});

export const promptTemplateSchema = promptTemplateBaseSchema.superRefine((value, ctx) => {
  const featureType = value.featureType as PromptFeatureType;
  const missingVariables = getMissingPromptVariables(featureType, value.userPromptTemplate);
  for (const name of missingVariables) {
    ctx.addIssue({
      code: "custom",
      path: ["userPromptTemplate"],
      message: `${promptFeatureLabels[featureType]}模板缺少变量 {{${name}}}`,
    });
  }

  if (featureType === "wrong_question") {
    if (!/json/i.test(value.userPromptTemplate)) {
      ctx.addIssue({
        code: "custom",
        path: ["userPromptTemplate"],
        message: "错题分析模板必须明确要求输出 JSON",
      });
    }

    const missingJsonFields = getMissingWrongQuestionJsonFields(value.userPromptTemplate);
    if (missingJsonFields.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["userPromptTemplate"],
        message: `错题分析 JSON 输出字段不完整：${missingJsonFields.join(", ")}`,
      });
    }
  }
});

export const packageSchema = z.object({
  name: z.string().min(1).max(100),
  monthlyPrice: z.coerce.number().min(0),
  studentLimit: z.coerce.number().int().min(1),
  wrongQuestionQuota: z.coerce.number().int().min(0),
  studyPlanQuota: z.coerce.number().int().min(0),
  dailyReportQuota: z.coerce.number().int().min(0),
  staffLimit: z.coerce.number().int().min(1),
  status: z.enum(["active", "inactive", "disabled"]).default("active"),
});
