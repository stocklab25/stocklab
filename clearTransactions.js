const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearTransactions() {
  try {
    console.log('Clearing all transactions...');
    
    // Delete all transactions
    const deletedCount = await prisma.stockTransaction.deleteMany({});
    
    console.log(`Successfully deleted ${deletedCount.count} transactions`);
  } catch (error) {
    console.error('Error clearing transactions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearTransactions(); 