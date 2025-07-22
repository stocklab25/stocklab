/*
  Warnings:

  - A unique constraint covering the columns `[r3vPurchaseOrderNumber]` on the table `purchase_orders` will be added. If there are existing duplicate values, this will fail.
*/

-- Step 1: Add the column as nullable first
ALTER TABLE "purchase_orders" ADD COLUMN "r3vPurchaseOrderNumber" TEXT;

-- Step 2: Populate existing records with generated R3V P.O. numbers
-- Using a simple approach with a sequence
CREATE SEQUENCE IF NOT EXISTS r3v_po_sequence START 1;

UPDATE "purchase_orders" 
SET "r3vPurchaseOrderNumber" = 'R3V-' || LPAD(nextval('r3v_po_sequence')::TEXT, 4, '0')
WHERE "r3vPurchaseOrderNumber" IS NULL;

-- Step 3: Make the column NOT NULL
ALTER TABLE "purchase_orders" ALTER COLUMN "r3vPurchaseOrderNumber" SET NOT NULL;

-- Step 4: Create unique index
CREATE UNIQUE INDEX "purchase_orders_r3vPurchaseOrderNumber_key" ON "purchase_orders"("r3vPurchaseOrderNumber");

-- Step 5: Clean up the sequence
DROP SEQUENCE r3v_po_sequence;
