CREATE TABLE "student_access_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "store_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "token" VARCHAR(80) NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'active',
  "expires_at" TIMESTAMP(3),
  "last_used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "student_access_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_task_progress" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "store_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "study_plan_id" UUID,
  "title" TEXT NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "student_task_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_ai_interactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "store_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "wrong_question_id" UUID,
  "interaction_type" VARCHAR(50) NOT NULL,
  "content" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "student_ai_interactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_access_tokens_token_key" ON "student_access_tokens"("token");
CREATE INDEX "student_access_tokens_store_id_student_id_idx" ON "student_access_tokens"("store_id", "student_id");
CREATE INDEX "student_task_progress_store_id_student_id_idx" ON "student_task_progress"("store_id", "student_id");
CREATE INDEX "student_task_progress_study_plan_id_idx" ON "student_task_progress"("study_plan_id");
CREATE INDEX "student_ai_interactions_store_id_student_id_idx" ON "student_ai_interactions"("store_id", "student_id");
CREATE INDEX "student_ai_interactions_wrong_question_id_idx" ON "student_ai_interactions"("wrong_question_id");

ALTER TABLE "student_access_tokens" ADD CONSTRAINT "student_access_tokens_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_task_progress" ADD CONSTRAINT "student_task_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_task_progress" ADD CONSTRAINT "student_task_progress_study_plan_id_fkey" FOREIGN KEY ("study_plan_id") REFERENCES "study_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_ai_interactions" ADD CONSTRAINT "student_ai_interactions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_ai_interactions" ADD CONSTRAINT "student_ai_interactions_wrong_question_id_fkey" FOREIGN KEY ("wrong_question_id") REFERENCES "wrong_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
