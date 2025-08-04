const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateReturnedToRefunded() {
  try {
    console.log('Updating sales with RETURNED status to COMPLETED temporarily...');
    
    // First, update all sales with RETURNED status to COMPLETED temporarily
    // We'll change them to REFUNDED after the schema migration
    const result = await prisma.sale.updateMany({
      where: {
        status: 'RETURNED'
      },
      data: {
        status: 'COMPLETED'
      }
    });
    
    console.log(`Updated ${result.count} sales from RETURNED to COMPLETED (temporarily)`);
    
    // Also update store inventory with RETURNED status to IN_STOCK
    const inventoryResult = await prisma.storeInventory.updateMany({
      where: {
        status: 'RETURNED'
      },
      data: {
        status: 'IN_STOCK'
      }
    });
    
    console.log(`Updated ${inventoryResult.count} store inventory items from RETURNED to IN_STOCK`);
    
  } catch (error) {
    console.error('Error updating data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateReturnedToRefunded(); 