/*
  Warnings:

  - Added the required column `transferCost` to the `store_inventory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "store_inventory" ADD COLUMN     "transferCost" DECIMAL(10,2) NOT NULL DEFAULT 0;
