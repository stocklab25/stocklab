/*
  Warnings:

  - You are about to drop the column `location` on the `inventory_items` table. All the data in the column will be lost.
  - You are about to drop the column `fromLocation` on the `stock_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `toLocation` on the `stock_transactions` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'TRANSFER_TO_STORE';
ALTER TYPE "TransactionType" ADD VALUE 'TRANSFER_FROM_STORE';
ALTER TYPE "TransactionType" ADD VALUE 'SALE_AT_STORE';

-- AlterTable
ALTER TABLE "inventory_items" DROP COLUMN "location";

-- AlterTable
ALTER TABLE "stock_transactions" DROP COLUMN "fromLocation",
DROP COLUMN "toLocation",
ADD COLUMN     "fromStoreId" TEXT,
ADD COLUMN     "toStoreId" TEXT;

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_inventory" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "store_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_inventory_storeId_inventoryItemId_key" ON "store_inventory"("storeId", "inventoryItemId");

-- AddForeignKey
ALTER TABLE "store_inventory" ADD CONSTRAINT "store_inventory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_inventory" ADD CONSTRAINT "store_inventory_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
