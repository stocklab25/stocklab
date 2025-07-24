-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('RECEIVABLE', 'PAYABLE');

-- CreateTable
CREATE TABLE "Accounting" (
    "id" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Accounting_pkey" PRIMARY KEY ("id")
);
