-- CreateTable
CREATE TABLE "transaction_orders" (
    "id" TEXT NOT NULL,
    "r3vTransactionNumber" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storeId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "transaction_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_order_items" (
    "id" TEXT NOT NULL,
    "transactionOrderId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_orders_r3vTransactionNumber_key" ON "transaction_orders"("r3vTransactionNumber");

-- AddForeignKey
ALTER TABLE "transaction_orders" ADD CONSTRAINT "transaction_orders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_order_items" ADD CONSTRAINT "transaction_order_items_transactionOrderId_fkey" FOREIGN KEY ("transactionOrderId") REFERENCES "transaction_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_order_items" ADD CONSTRAINT "transaction_order_items_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
