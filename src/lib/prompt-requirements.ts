export type PromptFeatureType = "wrong_question" | "study_plan" | "daily_report";

export const promptFeatureLabels: Record<PromptFeatureType, string> = {
  wrong_question: "错题分析",
  study_plan: "学习计划",
  daily_report: "家长日报",
};

export const requiredPromptVariables: Record<PromptFeatureType, string[]> = {
  wrong_question: ["grade", "subject", "goal", "weak_points", "student_reason", "extra_note"],
  study_plan: [
    "student_name",
    "grade",
    "goal",
    "weak_subjects",
    "weak_points",
    "recent_wrong_questions",
    "plan_type",
    "available_minutes",
    "focus_subject",
  ],
  daily_report: [
    "student_name",
    "grade",
    "parent_name",
    "study_duration",
    "study_content",
    "completion_status",
    "study_status",
    "wrong_question_summary",
    "staff_note",
  ],
};

export const wrongQuestionJsonFields = [
  "ocrText",
  "knowledgePoint",
  "questionType",
  "difficulty",
  "possibleReason",
  "hintLevel1",
  "hintLevel2",
  "fullExplanation",
  "reviewSuggestion",
  "similarPracticeSuggestion",
  "nextReviewDays",
  "content",
];

export function getMissingPromptVariables(featureType: PromptFeatureType, template: string) {
  return requiredPromptVariables[featureType].filter((name) => !template.includes(`{{${name}}}`));
}

export function getMissingWrongQuestionJsonFields(template: string) {
  return wrongQuestionJsonFields.filter((name) => !template.includes(name));
}
