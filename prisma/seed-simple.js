const { PrismaClient, UserRole, InventoryStatus } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.stockTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  console.log('👥 Creating users...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@stocklab.com',
      name: 'Admin User',
      password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1m', // password123
      role: UserRole.ADMIN,
    },
  });

  const regularUser = await prisma.user.create({
    data: {
      email: 'user@stocklab.com',
      name: 'Regular User',
      password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1m', // password123
      role: UserRole.USER,
    },
  });

  console.log('✅ Users created:', { adminUser: adminUser.email, regularUser: regularUser.email });

  // Create products (product types)
  console.log('📦 Creating products...');
  const products = await Promise.all([
    prisma.product.create({
      data: {
        brand: 'Nike',
        name: 'Air Jordan 1 Retro High',
        color: 'Chicago',
        sku: 'AJ1-CHI-001',
        cost: new Decimal('150.00'),
        payout: new Decimal('200.00'),
      },
    }),
    prisma.product.create({
      data: {
        brand: 'Adidas',
        name: 'Ultraboost 22',
        color: 'White',
        sku: 'UB22-WHT-002',
        cost: new Decimal('120.00'),
        payout: new Decimal('160.00'),
      },
    }),
    prisma.product.create({
      data: {
        brand: 'Vans',
        name: 'Old Skool',
        color: 'Red',
        sku: 'OS-RED-003',
        cost: new Decimal('40.00'),
        payout: new Decimal('60.00'),
      },
    }),
    prisma.product.create({
      data: {
        brand: 'Converse',
        name: 'Chuck Taylor All Star',
        color: 'Black',
        sku: 'CT-BLK-004',
        cost: new Decimal('30.00'),
        payout: new Decimal('45.00'),
      },
    }),
    prisma.product.create({
      data: {
        brand: 'New Balance',
        name: '574 Classic',
        color: 'Grey',
        sku: 'NB574-GRY-005',
        cost: new Decimal('50.00'),
        payout: new Decimal('75.00'),
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
        condition: 'Excellent',
        cost: new Decimal('40.00'),
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
        condition: 'Good',
        cost: new Decimal('35.00'),
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
        condition: 'Excellent',
        cost: new Decimal('150.00'),
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
        condition: 'Excellent',
        cost: new Decimal('120.00'),
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
        condition: 'Fair',
        cost: new Decimal('30.00'),
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
        productId: products[2].id,
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
        productId: products[2].id,
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
        productId: products[0].id,
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
        productId: products[1].id,
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
        productId: products[3].id,
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
        productId: products[2].id,
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
        productId: products[2].id,
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

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 