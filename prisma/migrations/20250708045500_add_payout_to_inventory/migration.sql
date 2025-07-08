/*
  Warnings:

  - You are about to drop the column `cost` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `payout` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `products` table. All the data in the column will be lost.
  - Added the required column `payout` to the `inventory_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "payout" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "cost",
DROP COLUMN "payout",
DROP COLUMN "quantity";
