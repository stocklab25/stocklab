-- CreateEnum
CREATE TYPE "AccountingStatus" AS ENUM ('PENDING', 'PAID', 'RECEIVED');

-- AlterTable
ALTER TABLE "Accounting" ADD COLUMN     "status" "AccountingStatus" NOT NULL DEFAULT 'PENDING';
