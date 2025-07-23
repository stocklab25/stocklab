/*
  Warnings:

  - Changed the type of `itemType` on the `products` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
-- Add a temporary column to store the string values
ALTER TABLE "products" ADD COLUMN "itemType_new" TEXT;

-- Copy data from the enum column to the new string column
UPDATE "products" SET "itemType_new" = "itemType"::TEXT;

-- Drop the old column and rename the new one
ALTER TABLE "products" DROP COLUMN "itemType";
ALTER TABLE "products" RENAME COLUMN "itemType_new" TO "itemType";

-- Make the column NOT NULL
ALTER TABLE "products" ALTER COLUMN "itemType" SET NOT NULL;

-- DropEnum
DROP TYPE "ItemType";
