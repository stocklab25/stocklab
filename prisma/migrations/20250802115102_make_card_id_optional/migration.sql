-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_cardId_fkey";

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "cardId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;
