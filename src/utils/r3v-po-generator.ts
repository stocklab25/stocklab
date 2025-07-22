import prisma from '@/lib/db';

export async function generateR3VPurchaseOrderNumber(): Promise<string> {
  // Find the last R3V purchase order number
  const lastPurchaseOrder = await prisma.purchaseOrder.findFirst({
    where: {
      r3vPurchaseOrderNumber: {
        startsWith: 'R3V',
      },
    },
    orderBy: {
      r3vPurchaseOrderNumber: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastPurchaseOrder?.r3vPurchaseOrderNumber) {
    // Extract the number from the last R3V P.O. number (e.g., "R3V-0001" -> 1)
    const match = lastPurchaseOrder.r3vPurchaseOrderNumber.match(/R3V-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  // Format as R3V-XXXX (4-digit zero-padded number)
  return `R3V-${nextNumber.toString().padStart(4, '0')}`;
} 