/*
  Warnings:

  - You are about to drop the column `stocklabSku` on the `products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stocklabSku]` on the table `inventory_items` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "products_stocklabSku_key";

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "stocklabSku" TEXT;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "stocklabSku";

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_stocklabSku_key" ON "inventory_items"("stocklabSku");
