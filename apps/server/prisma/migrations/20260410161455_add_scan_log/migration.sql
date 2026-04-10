-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('DISCOVERED', 'REGISTERED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "scan_logs" (
    "id" TEXT NOT NULL,
    "platform" "TicketPlatform" NOT NULL,
    "external_id" TEXT NOT NULL,
    "status" "ScanStatus" NOT NULL,
    "reason" TEXT,
    "performance_id" TEXT,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scan_logs_platform_external_id_key" ON "scan_logs"("platform", "external_id");
