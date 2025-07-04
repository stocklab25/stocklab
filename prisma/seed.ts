import { PrismaClient } from '@prisma/client';
import { products, inventory, stockTransactions } from '../src/app/api/mockData';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

function mapStatus(status: string): any {
  switch (status) {
    case 'In-Stock': return 'InStock';
    case 'Returned': return 'Returned';
    case 'Out-of-Stock': return 'OutOfStock';
    case 'Discontinued': return 'Discontinued';
    case 'Sold': return 'Sold';
    default: return undefined;
  }
}

function mapType(type: string): any {
  switch (type) {
    case 'in': return 'IN';
    case 'out': return 'OUT';
    case 'move': return 'MOVE';
    case 'return': return 'RETURN';
    case 'adjustment': return 'ADJUSTMENT';
    case 'audit': return 'AUDIT';
    default: return undefined;
  }
}

async function main() {
  // Seed users
  const hashedPassword = await hashPassword('password123');
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@stocklab.com' },
    update: {},
    create: {
      email: 'admin@stocklab.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@stocklab.com' },
    update: {},
    create: {
      email: 'user@stocklab.com',
      name: 'Regular User',
      password: hashedPassword,
      role: 'USER',
    },
  });

  // Seed products with quantity set to 0
  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: { quantity: 0 },
      create: {
        id: product.id,
        brand: product.brand,
        name: product.name,
        color: product.color,
        sku: product.sku,
        quantity: 0,
      },
    });
  }

  // Seed inventory items
  for (const item of inventory) {
    await prisma.inventoryItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        productId: item.productId,
        sku: item.sku,
        size: item.size,
        condition: item.condition,
        cost: item.cost,
        consigner: item.consigner,
        consignDate: new Date(item.consignDate),
        status: mapStatus(item.status),
        location: item.location,
      },
    });
  }

  // Seed stock transactions
  for (const txn of stockTransactions) {
    // Find the inventory item to get the productId
    const inventoryItem = inventory.find(item => item.id === txn.itemId);
    const productId = inventoryItem ? inventoryItem.productId : '';
    await prisma.stockTransaction.upsert({
      where: { id: txn.id },
      update: {},
      create: {
        id: txn.id,
        productId,
        inventoryItemId: txn.itemId || null,
        type: mapType(txn.type),
        quantity: txn.quantity,
        date: new Date(txn.date),
        fromLocation: txn.fromLocation,
        toLocation: txn.toLocation,
        userId: adminUser.id, // Use admin user for seeded transactions
        notes: txn.notes,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 