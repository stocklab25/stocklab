import { PrismaClient, UserRole, InventoryStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// WARNING: Always hash passwords at runtime! Do NOT use hardcoded bcrypt hashes.
// This prevents login issues due to bcrypt version/cost mismatches.

// Helper to retry on prepared statement error
async function runWithReconnect(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.includes('prepared statement') || msg.includes('already exists')) {
      console.warn('⚠️ Prepared statement error detected. Creating fresh Prisma client and retrying...');
      await prisma.$disconnect();
      // Create a fresh Prisma client instance
      const freshPrisma = new PrismaClient();
      await freshPrisma.$connect();
      
      // Replace the global prisma instance
      Object.assign(prisma, freshPrisma);
      
      await fn(); // Retry once
    } else {
      throw err;
    }
  }
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.stockTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.product.deleteMany();

  // Hash passwords at runtime
  const adminPassword = await bcrypt.hash('password123', 12);
  const regularPassword = await bcrypt.hash('password123', 12);

  // Create users only if they don't exist
  console.log('👥 Ensuring users exist...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@stocklab.com' },
    update: {},
    create: {
      email: 'admin@stocklab.com',
      name: 'Admin User',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@stocklab.com' },
    update: {},
    create: {
      email: 'user@stocklab.com',
      name: 'Regular User',
      password: regularPassword,
      role: UserRole.USER,
    },
  });
  console.log('✅ Users ensured:', { adminUser: adminUser.email, regularUser: regularUser.email });

  // Create products (product types)
  console.log('📦 Creating products...');
  const products = await Promise.all([
    prisma.product.create({
      data: {
        brand: 'Nike',
        name: 'Air Jordan 1 Retro High',
        color: 'Chicago',
        sku: 'AJ1-CHI-001',
        itemType: 'SHOE',
      },
    }),
    prisma.product.create({
      data: {
        brand: 'Adidas',
        name: 'Ultraboost 22',
        color: 'White',
        sku: 'UB22-WHT-002',
        itemType: 'SHOE',
      },
    }),
    prisma.product.create({
      data: {
        brand: 'Vans',
        name: 'Old Skool',
        color: 'Red',
        sku: 'OS-RED-003',
        itemType: 'SHOE',
      },
    }),
    prisma.product.create({
      data: {
        brand: 'Converse',
        name: 'Chuck Taylor All Star',
        color: 'Black',
        sku: 'CT-BLK-004',
        itemType: 'SHOE',
      },
    }),
    prisma.product.create({
      data: {
        brand: 'New Balance',
        name: '574 Classic',
        color: 'Grey',
        sku: 'NB574-GRY-005',
        itemType: 'SHOE',
      },
    }),
  ]);

  console.log('✅ Products created:', products.length);

  // Create inventory items (specific variants with quantities)
  console.log('📋 Creating inventory items...');
  const inventoryItems = await Promise.all([
    // Vans Old Skool Red - Size 10 (5 pieces)
    prisma.inventoryItem.create({
      data: {
        productId: products[2].id, // Vans Old Skool Red
        sku: 'OS-RED-10-001',
        size: '10',
        condition: 'PRE_OWNED',
        cost: new Decimal('40.00'),
        payout: new Decimal('60.00'),
        consigner: 'John Doe',
        consignDate: new Date('2024-01-15'),
        status: InventoryStatus.InStock,
        location: 'Shelf A1',
        quantity: 5,
      },
    }),
    // Vans Old Skool Red - Size 9 (3 pieces)
    prisma.inventoryItem.create({
      data: {
        productId: products[2].id, // Vans Old Skool Red
        sku: 'OS-RED-9-002',
        size: '9',
        condition: 'PRE_OWNED',
        cost: new Decimal('35.00'),
        payout: new Decimal('55.00'),
        consigner: 'Jane Smith',
        consignDate: new Date('2024-01-20'),
        status: InventoryStatus.InStock,
        location: 'Shelf A2',
        quantity: 3,
      },
    }),
    // Nike Air Jordan 1 - Size 10 (2 pieces)
    prisma.inventoryItem.create({
      data: {
        productId: products[0].id, // Nike Air Jordan 1
        sku: 'AJ1-CHI-10-003',
        size: '10',
        condition: 'NEW',
        cost: new Decimal('150.00'),
        payout: new Decimal('200.00'),
        consigner: 'Mike Johnson',
        consignDate: new Date('2024-01-25'),
        status: InventoryStatus.InStock,
        location: 'Shelf B1',
        quantity: 2,
      },
    }),
    // Adidas Ultraboost - Size 9.5 (1 piece, sold)
    prisma.inventoryItem.create({
      data: {
        productId: products[1].id, // Adidas Ultraboost
        sku: 'UB22-WHT-9.5-004',
        size: '9.5',
        condition: 'NEW',
        cost: new Decimal('120.00'),
        payout: new Decimal('160.00'),
        consigner: 'Sarah Wilson',
        consignDate: new Date('2024-02-01'),
        status: InventoryStatus.Sold,
        location: 'Sold',
        quantity: 0,
      },
    }),
    // Converse Chuck Taylor - Size 8 (4 pieces)
    prisma.inventoryItem.create({
      data: {
        productId: products[3].id, // Converse Chuck Taylor
        sku: 'CT-BLK-8-005',
        size: '8',
        condition: 'PRE_OWNED',
        cost: new Decimal('30.00'),
        payout: new Decimal('45.00'),
        consigner: 'Tom Brown',
        consignDate: new Date('2024-02-05'),
        status: InventoryStatus.InStock,
        location: 'Shelf C1',
        quantity: 4,
      },
    }),
  ]);

  console.log('✅ Inventory items created:', inventoryItems.length);

  // Create stock transactions
  console.log('📊 Creating stock transactions...');
  const transactions = await Promise.all([
    // IN transaction for Vans Size 10
    prisma.stockTransaction.create({
      data: {
        type: 'IN',
        quantity: 5,
        date: new Date('2024-01-15'),
        notes: 'Initial consignment - Vans Old Skool Red Size 10',
        inventoryItemId: inventoryItems[0].id,
        userId: adminUser.id,
      },
    }),
    // IN transaction for Vans Size 9
    prisma.stockTransaction.create({
      data: {
        type: 'IN',
        quantity: 3,
        date: new Date('2024-01-20'),
        notes: 'Initial consignment - Vans Old Skool Red Size 9',
        inventoryItemId: inventoryItems[1].id,
        userId: adminUser.id,
      },
    }),
    // IN transaction for Nike Air Jordan 1
    prisma.stockTransaction.create({
      data: {
        type: 'IN',
        quantity: 2,
        date: new Date('2024-01-25'),
        notes: 'Initial consignment - Nike Air Jordan 1 Size 10',
        inventoryItemId: inventoryItems[2].id,
        userId: regularUser.id,
      },
    }),
    // OUT transaction for Adidas Ultraboost (sold)
    prisma.stockTransaction.create({
      data: {
        type: 'OUT',
        quantity: 1,
        date: new Date('2024-02-10'),
        notes: 'Sold to customer',
        inventoryItemId: inventoryItems[3].id,
        userId: regularUser.id,
      },
    }),
    // IN transaction for Converse Chuck Taylor
    prisma.stockTransaction.create({
      data: {
        type: 'IN',
        quantity: 4,
        date: new Date('2024-02-05'),
        notes: 'Initial consignment - Converse Chuck Taylor Size 8',
        inventoryItemId: inventoryItems[4].id,
        userId: adminUser.id,
      },
    }),
  ]);

  console.log('✅ Stock transactions created:', transactions.length);

  // Create some additional transactions for testing
  console.log('🔄 Creating additional test transactions...');
  const additionalTransactions = await Promise.all([
    // MOVE transaction
    prisma.stockTransaction.create({
      data: {
        type: 'MOVE',
        quantity: 2,
        date: new Date('2024-02-15'),
        fromLocation: 'Shelf A1',
        toLocation: 'Display Case',
        notes: 'Moved Vans Size 10 to display',
        inventoryItemId: inventoryItems[0].id,
        userId: adminUser.id,
      },
    }),
    // OUT transaction (sold 1 Vans Size 10)
    prisma.stockTransaction.create({
      data: {
        type: 'OUT',
        quantity: 1,
        date: new Date('2024-02-20'),
        notes: 'Sold 1 Vans Old Skool Red Size 10',
        inventoryItemId: inventoryItems[0].id,
        userId: regularUser.id,
      },
    }),
  ]);

  console.log('✅ Additional transactions created:', additionalTransactions.length);

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`- Users: ${2}`);
  console.log(`- Products: ${products.length}`);
  console.log(`- Inventory Items: ${inventoryItems.length}`);
  console.log(`- Stock Transactions: ${transactions.length + additionalTransactions.length}`);
  console.log('\n🔑 Login Credentials:');
  console.log('Admin: admin@stocklab.com / password123');
  console.log('User: user@stocklab.com / password123');
  console.log('\n📦 Example Inventory:');
  console.log('- Vans Old Skool Red Size 10: 4 pieces in stock');
  console.log('- Vans Old Skool Red Size 9: 3 pieces in stock');
  console.log('- Nike Air Jordan 1 Size 10: 2 pieces in stock');
  console.log('- Converse Chuck Taylor Size 8: 4 pieces in stock');
}

runWithReconnect(main)
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 