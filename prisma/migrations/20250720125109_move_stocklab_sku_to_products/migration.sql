/*
  Warnings:

  - You are about to drop the column `stocklabSku` on the `inventory_items` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stocklabSku]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "inventory_items_stocklabSku_key";

-- AlterTable
ALTER TABLE "inventory_items" DROP COLUMN "stocklabSku";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "stocklabSku" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "products_stocklabSku_key" ON "products"("stocklabSku");
