CREATE TYPE "ImportErrorStatus" AS ENUM ('PENDING', 'CORRECTED', 'IGNORED');

ALTER TABLE "import_batches"
  ADD COLUMN "original_file_name" TEXT,
  ADD COLUMN "stored_file_path" TEXT,
  ADD COLUMN "file_hash" TEXT,
  ADD COLUMN "file_size_bytes" BIGINT;

ALTER TABLE "import_errors"
  ADD COLUMN "original_value" TEXT,
  ADD COLUMN "corrected_value" TEXT,
  ADD COLUMN "status" "ImportErrorStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "resolution_notes" TEXT,
  ADD COLUMN "resolved_by" UUID,
  ADD COLUMN "resolved_at" TIMESTAMP(3);

CREATE INDEX "import_errors_status_idx" ON "import_errors"("status");

CREATE INDEX "loss_entries_production_order_id_idx" ON "loss_entries"("production_order_id");

ALTER TABLE "loss_entries"
  ADD CONSTRAINT "loss_entries_production_order_id_fkey"
  FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "productivity_entries"
  ADD CONSTRAINT "productivity_entries_week_id_fkey"
  FOREIGN KEY ("week_id") REFERENCES "weekly_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
