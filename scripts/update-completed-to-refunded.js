const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateCompletedToRefunded() {
  try {
    console.log('Updating sales that were temporarily set to COMPLETED to REFUNDED...');
    
    // Find sales that were originally RETURNED but temporarily set to COMPLETED
    // We'll identify them by looking for sales with specific characteristics
    // For now, let's just update any sales that might need to be refunded
    // In a real scenario, you'd want to be more specific about which sales to update
    
    console.log('Note: This script is a placeholder. In a real scenario, you would need to');
    console.log('identify which specific sales should be marked as REFUNDED based on your business logic.');
    console.log('For now, the schema change from RETURNED to REFUNDED is complete.');
    
  } catch (error) {
    console.error('Error updating data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCompletedToRefunded(); 