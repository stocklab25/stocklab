-- CreateEnum
CREATE TYPE "InventoryNote" AS ENUM ('DMG_BOX', 'NO_BOX', 'REP_BOX', 'FLAWED');

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "note" "InventoryNote";
