import prisma from '@/lib/db';

export async function generateStockLabSku(): Promise<string> {
  // Find the last product with a StockLab SKU
  const lastProduct = await prisma.product.findFirst({
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
  if (lastProduct?.stocklabSku) {
    const match = lastProduct.stocklabSku.match(/SL(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `SL${nextNumber.toString().padStart(3, '0')}`;
} 