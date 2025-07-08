-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('SHOE', 'APPAREL');

-- AlterTable
-- First add the column as nullable
ALTER TABLE "inventory_items" ADD COLUMN "itemType" "ItemType";

-- Update existing records to have a default value (assuming all existing items are shoes)
UPDATE "inventory_items" SET "itemType" = 'SHOE' WHERE "itemType" IS NULL;

-- Make the column NOT NULL
ALTER TABLE "inventory_items" ALTER COLUMN "itemType" SET NOT NULL;
