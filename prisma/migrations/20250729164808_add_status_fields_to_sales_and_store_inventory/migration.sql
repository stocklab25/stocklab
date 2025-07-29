-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'RETURNED');

-- CreateEnum
CREATE TYPE "StoreInventoryStatus" AS ENUM ('IN_STOCK', 'SOLD', 'RETURNED');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED';

-- AlterTable
ALTER TABLE "store_inventory" ADD COLUMN     "status" "StoreInventoryStatus" NOT NULL DEFAULT 'IN_STOCK';
