/*
  Warnings:

  - You are about to drop the column `style` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "style",
ADD COLUMN     "sku" TEXT;
