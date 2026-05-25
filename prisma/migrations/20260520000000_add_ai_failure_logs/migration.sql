CREATE TABLE "ai_failure_logs" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "user_id" UUID,
    "feature_type" "FeatureType" NOT NULL,
    "model_name" VARCHAR(100) NOT NULL,
    "error_message" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_failure_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_failure_logs_store_id_feature_type_idx" ON "ai_failure_logs"("store_id", "feature_type");
CREATE INDEX "ai_failure_logs_store_id_created_at_idx" ON "ai_failure_logs"("store_id", "created_at");

ALTER TABLE "ai_failure_logs" ADD CONSTRAINT "ai_failure_logs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_failure_logs" ADD CONSTRAINT "ai_failure_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
