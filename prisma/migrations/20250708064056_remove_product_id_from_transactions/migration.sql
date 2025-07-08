/*
  Warnings:

  - You are about to drop the column `productId` on the `stock_transactions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "stock_transactions" DROP CONSTRAINT "stock_transactions_productId_fkey";

-- AlterTable
ALTER TABLE "stock_transactions" DROP COLUMN "productId";
