/*
  Warnings:

  - Changed the type of `condition` on the `inventory_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('NEW', 'PRE_OWNED');

-- AlterTable
ALTER TABLE "inventory_items" DROP COLUMN "condition",
ADD COLUMN     "condition" "ItemCondition" NOT NULL;
