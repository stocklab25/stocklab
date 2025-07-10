-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "r3vPurchaseOrderNumber" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "orderNumber" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "cost" DECIMAL(10,2) NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchases_r3vPurchaseOrderNumber_key" ON "purchases"("r3vPurchaseOrderNumber");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
