-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('platform_admin', 'store_owner', 'staff');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('active', 'inactive', 'disabled');

-- CreateEnum
CREATE TYPE "MasteryStatus" AS ENUM ('not_mastered', 'reviewing', 'mastered', 'focus');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('today', 'weekly');

-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('wrong_question', 'study_plan', 'daily_report');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "store_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "email" VARCHAR(100),
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "owner_user_id" UUID,
    "logo_url" TEXT,
    "package_type" VARCHAR(50),
    "package_expire_at" TIMESTAMP(3),
    "status" "RecordStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "assigned_user_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "grade" VARCHAR(50) NOT NULL,
    "main_subjects" TEXT NOT NULL DEFAULT '',
    "goal" TEXT NOT NULL DEFAULT '',
    "weak_subjects" TEXT NOT NULL DEFAULT '',
    "weak_points" TEXT NOT NULL DEFAULT '',
    "parent_name" VARCHAR(100),
    "parent_contact" VARCHAR(100),
    "remark" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wrong_questions" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "created_by" UUID,
    "subject" VARCHAR(50) NOT NULL,
    "image_url" TEXT,
    "student_reason" TEXT,
    "ocr_text" TEXT,
    "knowledge_point" TEXT,
    "question_type" TEXT,
    "difficulty" VARCHAR(50),
    "ai_analysis" TEXT NOT NULL,
    "hint_level_1" TEXT,
    "hint_level_2" TEXT,
    "full_explanation" TEXT,
    "review_suggestion" TEXT,
    "next_review_date" DATE,
    "mastery_status" "MasteryStatus" NOT NULL DEFAULT 'not_mastered',
    "ai_model" VARCHAR(100),
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "raw_output" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wrong_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_plans" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "created_by" UUID,
    "plan_type" "PlanType" NOT NULL,
    "available_minutes" INTEGER NOT NULL,
    "focus_subject" VARCHAR(50),
    "input_data" JSONB NOT NULL,
    "content" TEXT NOT NULL,
    "ai_model" VARCHAR(100),
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "raw_output" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "created_by" UUID,
    "report_date" DATE NOT NULL,
    "study_duration" TEXT NOT NULL,
    "study_content" TEXT NOT NULL,
    "completion_status" VARCHAR(50) NOT NULL,
    "study_status" VARCHAR(50) NOT NULL,
    "input_data" JSONB NOT NULL,
    "content" TEXT NOT NULL,
    "copied_count" INTEGER NOT NULL DEFAULT 0,
    "ai_model" VARCHAR(100),
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "raw_output" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "monthly_price" DECIMAL(10,2) NOT NULL,
    "student_limit" INTEGER NOT NULL,
    "wrong_question_quota" INTEGER NOT NULL,
    "study_plan_quota" INTEGER NOT NULL,
    "daily_report_quota" INTEGER NOT NULL,
    "staff_limit" INTEGER NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_quotas" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "package_id" UUID,
    "month" VARCHAR(20) NOT NULL,
    "wrong_question_used" INTEGER NOT NULL DEFAULT 0,
    "wrong_question_quota" INTEGER NOT NULL DEFAULT 0,
    "study_plan_used" INTEGER NOT NULL DEFAULT 0,
    "study_plan_quota" INTEGER NOT NULL DEFAULT 0,
    "daily_report_used" INTEGER NOT NULL DEFAULT 0,
    "daily_report_quota" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "user_id" UUID,
    "feature_type" "FeatureType" NOT NULL,
    "model_name" VARCHAR(100) NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "charged_units" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" UUID NOT NULL,
    "feature_type" "FeatureType" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "user_prompt_template" TEXT NOT NULL,
    "model_name" VARCHAR(100) NOT NULL,
    "temperature" DECIMAL(3,2) NOT NULL DEFAULT 0.3,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "RecordStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_store_id_idx" ON "users"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "stores_owner_user_id_key" ON "stores"("owner_user_id");

-- CreateIndex
CREATE INDEX "students_store_id_status_idx" ON "students"("store_id", "status");

-- CreateIndex
CREATE INDEX "students_assigned_user_id_idx" ON "students"("assigned_user_id");

-- CreateIndex
CREATE INDEX "wrong_questions_store_id_student_id_idx" ON "wrong_questions"("store_id", "student_id");

-- CreateIndex
CREATE INDEX "wrong_questions_store_id_subject_idx" ON "wrong_questions"("store_id", "subject");

-- CreateIndex
CREATE INDEX "wrong_questions_store_id_mastery_status_idx" ON "wrong_questions"("store_id", "mastery_status");

-- CreateIndex
CREATE INDEX "study_plans_store_id_student_id_idx" ON "study_plans"("store_id", "student_id");

-- CreateIndex
CREATE INDEX "daily_reports_store_id_student_id_idx" ON "daily_reports"("store_id", "student_id");

-- CreateIndex
CREATE INDEX "daily_reports_store_id_report_date_idx" ON "daily_reports"("store_id", "report_date");

-- CreateIndex
CREATE UNIQUE INDEX "store_quotas_store_id_month_key" ON "store_quotas"("store_id", "month");

-- CreateIndex
CREATE INDEX "ai_usage_logs_store_id_feature_type_idx" ON "ai_usage_logs"("store_id", "feature_type");

-- CreateIndex
CREATE INDEX "ai_usage_logs_store_id_created_at_idx" ON "ai_usage_logs"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "prompt_templates_feature_type_status_idx" ON "prompt_templates"("feature_type", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wrong_questions" ADD CONSTRAINT "wrong_questions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wrong_questions" ADD CONSTRAINT "wrong_questions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wrong_questions" ADD CONSTRAINT "wrong_questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_quotas" ADD CONSTRAINT "store_quotas_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_quotas" ADD CONSTRAINT "store_quotas_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
