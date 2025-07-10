/*
  Warnings:

  - You are about to drop the column `consignDate` on the `inventory_items` table. All the data in the column will be lost.
  - You are about to drop the column `consigner` on the `inventory_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "inventory_items" DROP COLUMN "consignDate",
DROP COLUMN "consigner";
