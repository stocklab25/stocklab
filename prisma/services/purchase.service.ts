import prisma from '@/lib/db';

// Function to generate the next R3V PO number
async function generateNextR3VPONumber(): Promise<string> {
  // Get the highest existing R3V PO number
  const lastPurchase = await prisma.purchase.findFirst({
    orderBy: {
      r3vPurchaseOrderNumber: 'desc',
    },
    select: {
      r3vPurchaseOrderNumber: true,
    },
  });

  if (!lastPurchase) {
    // If no purchases exist, start with R3VPO1
    return 'R3VPO1';
  }

  // Extract the number from the last R3V PO number
  const lastNumber = parseInt(lastPurchase.r3vPurchaseOrderNumber.replace('R3VPO', ''));
  const nextNumber = lastNumber + 1;
  
  return `R3VPO${nextNumber}`;
}

export interface CreatePurchaseData {
  inventoryItemId: string;
  vendor: string;
  paymentMethod: string;
  orderNumber?: string;
  quantity: number;
  cost: number;
  purchaseDate?: Date;
  notes?: string;
}

export const purchaseService = {
  // Create a new purchase record
  async createPurchase(data: CreatePurchaseData) {
    const r3vPurchaseOrderNumber = await generateNextR3VPONumber();

    return await prisma.purchase.create({
      data: {
        r3vPurchaseOrderNumber,
        inventoryItemId: data.inventoryItemId,
        vendor: data.vendor,
        paymentMethod: data.paymentMethod,
        orderNumber: data.orderNumber,
        quantity: data.quantity,
        cost: data.cost,
        purchaseDate: data.purchaseDate || new Date(),
        notes: data.notes,
      },
      include: {
        inventoryItem: {
          include: {
            product: true,
          },
        },
      },
    });
  },

  // Get all purchases
  async getAllPurchases() {
    return await prisma.purchase.findMany({
      include: {
        inventoryItem: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });
  },

  // Get purchases by inventory item
  async getPurchasesByInventoryItem(inventoryItemId: string) {
    return await prisma.purchase.findMany({
      where: {
        inventoryItemId,
      },
      include: {
        inventoryItem: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });
  },

  // Get purchase by ID
  async getPurchaseById(id: string) {
    return await prisma.purchase.findUnique({
      where: { id },
      include: {
        inventoryItem: {
          include: {
            product: true,
          },
        },
      },
    });
  },

  // Update purchase
  async updatePurchase(id: string, data: Partial<CreatePurchaseData>) {
    return await prisma.purchase.update({
      where: { id },
      data,
      include: {
        inventoryItem: {
          include: {
            product: true,
          },
        },
      },
    });
  },

  // Delete purchase (soft delete)
  async deletePurchase(id: string) {
    return await prisma.purchase.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  },
};

// Helper to get the next available SL SKU
async function getNextAvailableStocklabSku() {
  const items = await prisma.inventoryItem.findMany({
    where: {
      stocklabSku: { not: null },
    },
    select: { stocklabSku: true },
  });
  const usedNumbers = new Set(
    items
      .map(i => i.stocklabSku)
      .filter(Boolean)
      .map(sku => parseInt((sku as string).replace('SL', ''), 10))
      .filter(n => !isNaN(n))
  );
  let next = 1;
  while (usedNumbers.has(next)) next++;
  return `SL${next}`;
}

export async function fulfillPurchaseOrder(purchaseOrder: any) {
  const createdInventoryItems = [];

  for (const item of purchaseOrder.purchaseOrderItems) {
    for (let i = 0; i < item.quantityOrdered; i++) {
      let inventoryItem;
      let attempts = 0;
      while (!inventoryItem && attempts < 5) {
        const stocklabSku = await getNextAvailableStocklabSku();
        try {
          inventoryItem = await prisma.inventoryItem.create({
            data: {
              productId: item.productId,
              sku: item.product?.sku || '',
              stocklabSku,
              size: item.size,
              condition: item.condition || 'NEW',
              cost: item.unitCost,
              status: 'InStock',
              quantity: 1,
              purchaseOrderId: purchaseOrder.id,
            },
            include: {
              product: true,
            },
          });
        } catch (err: any) {
          if (err.code === 'P2002') {
            attempts++;
            continue;
          }
          throw err;
        }
      }
      if (!inventoryItem) throw new Error('Failed to generate unique stocklabSku after 5 attempts');
      await prisma.stockTransaction.create({
        data: {
          type: 'IN',
          quantity: 1,
          date: new Date(),
          notes: `Stock in from purchase order ${purchaseOrder.orderNumber} - ${item.product?.name || ''} ${item.size} (Item ${i + 1}/${item.quantityOrdered})`,
          inventoryItemId: inventoryItem.id,
          userId: null,
        },
      });
      createdInventoryItems.push(inventoryItem);
    }
  }

  return createdInventoryItems;
}