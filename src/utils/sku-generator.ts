import prisma from '@/lib/db';

export async function generateStockLabSku(): Promise<string> {
  // Find the last inventory item with a StockLab SKU
  const lastInventoryItem = await prisma.inventoryItem.findFirst({
    where: {
      stocklabSku: {
        not: null,
      },
    },
    orderBy: {
      stocklabSku: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastInventoryItem?.stocklabSku) {
    const match = lastInventoryItem.stocklabSku.match(/SL(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `SL${nextNumber}`;
} 