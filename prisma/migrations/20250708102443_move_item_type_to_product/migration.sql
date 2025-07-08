-- First, add the itemType column to products as nullable
ALTER TABLE "products" ADD COLUMN "itemType" "ItemType";

-- Update products to have itemType based on their inventory items
-- Since all existing products are shoes, set them all to SHOE
UPDATE "products" SET "itemType" = 'SHOE' WHERE "itemType" IS NULL;

-- Make the itemType column NOT NULL
ALTER TABLE "products" ALTER COLUMN "itemType" SET NOT NULL;

-- Now drop the itemType column from inventory_items
ALTER TABLE "inventory_items" DROP COLUMN "itemType";
