const { PrismaClient, UserRole, InventoryStatus } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data one by one
    console.log('🧹 Clearing existing data...');
    await prisma.stockTransaction.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    // Create users one by one
    console.log('👥 Creating users...');
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@stocklab.com',
        name: 'Admin User',
        password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1m', // password123
        role: UserRole.ADMIN,
      },
    });
    console.log('✅ Admin user created');

    const regularUser = await prisma.user.create({
      data: {
        email: 'user@stocklab.com',
        name: 'Regular User',
        password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1m', // password123
        role: UserRole.USER,
      },
    });
    console.log('✅ Regular user created');

    // Create products one by one
    console.log('📦 Creating products...');
    const product1 = await prisma.product.create({
      data: {
        brand: 'Nike',
        name: 'Air Jordan 1 Retro High',
        color: 'Chicago',
        sku: 'AJ1-CHI-001',
        cost: new Decimal('150.00'),
        payout: new Decimal('200.00'),
      },
    });
    console.log('✅ Product 1 created: Nike Air Jordan 1');

    const product2 = await prisma.product.create({
      data: {
        brand: 'Adidas',
        name: 'Ultraboost 22',
        color: 'White',
        sku: 'UB22-WHT-002',
        cost: new Decimal('120.00'),
        payout: new Decimal('160.00'),
      },
    });
    console.log('✅ Product 2 created: Adidas Ultraboost 22');

    const product3 = await prisma.product.create({
      data: {
        brand: 'Vans',
        name: 'Old Skool',
        color: 'Red',
        sku: 'OS-RED-003',
        cost: new Decimal('40.00'),
        payout: new Decimal('60.00'),
      },
    });
    console.log('✅ Product 3 created: Vans Old Skool Red');

    const product4 = await prisma.product.create({
      data: {
        brand: 'Converse',
        name: 'Chuck Taylor All Star',
        color: 'Black',
        sku: 'CT-BLK-004',
        cost: new Decimal('30.00'),
        payout: new Decimal('45.00'),
      },
    });
    console.log('✅ Product 4 created: Converse Chuck Taylor');

    const product5 = await prisma.product.create({
      data: {
        brand: 'New Balance',
        name: '574 Classic',
        color: 'Grey',
        sku: 'NB574-GRY-005',
        cost: new Decimal('50.00'),
        payout: new Decimal('75.00'),
      },
    });
    console.log('✅ Product 5 created: New Balance 574');

    // Create inventory items one by one
    console.log('📋 Creating inventory items...');
    
    const inventory1 = await prisma.inventoryItem.create({
      data: {
        productId: product3.id, // Vans Old Skool Red
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
    });
    console.log('✅ Inventory 1 created: Vans Size 10');

    const inventory2 = await prisma.inventoryItem.create({
      data: {
        productId: product3.id, // Vans Old Skool Red
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
    });
    console.log('✅ Inventory 2 created: Vans Size 9');

    const inventory3 = await prisma.inventoryItem.create({
      data: {
        productId: product1.id, // Nike Air Jordan 1
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
    });
    console.log('✅ Inventory 3 created: Nike Size 10');

    const inventory4 = await prisma.inventoryItem.create({
      data: {
        productId: product2.id, // Adidas Ultraboost
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
    });
    console.log('✅ Inventory 4 created: Adidas Size 9.5 (Sold)');

    const inventory5 = await prisma.inventoryItem.create({
      data: {
        productId: product4.id, // Converse Chuck Taylor
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
    });
    console.log('✅ Inventory 5 created: Converse Size 8');

    // Create stock transactions one by one
    console.log('📊 Creating stock transactions...');
    
    const transaction1 = await prisma.stockTransaction.create({
      data: {
        type: 'IN',
        quantity: 5,
        date: new Date('2024-01-15'),
        notes: 'Initial consignment - Vans Old Skool Red Size 10',
        productId: product3.id,
        inventoryItemId: inventory1.id,
        userId: adminUser.id,
      },
    });
    console.log('✅ Transaction 1 created: IN - Vans Size 10');

    const transaction2 = await prisma.stockTransaction.create({
      data: {
        type: 'IN',
        quantity: 3,
        date: new Date('2024-01-20'),
        notes: 'Initial consignment - Vans Old Skool Red Size 9',
        productId: product3.id,
        inventoryItemId: inventory2.id,
        userId: adminUser.id,
      },
    });
    console.log('✅ Transaction 2 created: IN - Vans Size 9');

    const transaction3 = await prisma.stockTransaction.create({
      data: {
        type: 'IN',
        quantity: 2,
        date: new Date('2024-01-25'),
        notes: 'Initial consignment - Nike Air Jordan 1 Size 10',
        productId: product1.id,
        inventoryItemId: inventory3.id,
        userId: regularUser.id,
      },
    });
    console.log('✅ Transaction 3 created: IN - Nike Size 10');

    const transaction4 = await prisma.stockTransaction.create({
      data: {
        type: 'OUT',
        quantity: 1,
        date: new Date('2024-02-10'),
        notes: 'Sold to customer',
        productId: product2.id,
        inventoryItemId: inventory4.id,
        userId: regularUser.id,
      },
    });
    console.log('✅ Transaction 4 created: OUT - Adidas Size 9.5');

    const transaction5 = await prisma.stockTransaction.create({
      data: {
        type: 'IN',
        quantity: 4,
        date: new Date('2024-02-05'),
        notes: 'Initial consignment - Converse Chuck Taylor Size 8',
        productId: product4.id,
        inventoryItemId: inventory5.id,
        userId: adminUser.id,
      },
    });
    console.log('✅ Transaction 5 created: IN - Converse Size 8');

    // Create additional test transactions
    console.log('🔄 Creating additional test transactions...');
    
    const transaction6 = await prisma.stockTransaction.create({
      data: {
        type: 'MOVE',
        quantity: 2,
        date: new Date('2024-02-15'),
        fromLocation: 'Shelf A1',
        toLocation: 'Display Case',
        notes: 'Moved Vans Size 10 to display',
        productId: product3.id,
        inventoryItemId: inventory1.id,
        userId: adminUser.id,
      },
    });
    console.log('✅ Transaction 6 created: MOVE - Vans Size 10');

    const transaction7 = await prisma.stockTransaction.create({
      data: {
        type: 'OUT',
        quantity: 1,
        date: new Date('2024-02-20'),
        notes: 'Sold 1 Vans Old Skool Red Size 10',
        productId: product3.id,
        inventoryItemId: inventory1.id,
        userId: regularUser.id,
      },
    });
    console.log('✅ Transaction 7 created: OUT - Vans Size 10');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Users: ${2}`);
    console.log(`- Products: ${5}`);
    console.log(`- Inventory Items: ${5}`);
    console.log(`- Stock Transactions: ${7}`);
    console.log('\n🔑 Login Credentials:');
    console.log('Admin: admin@stocklab.com / password123');
    console.log('User: user@stocklab.com / password123');
    console.log('\n📦 Example Inventory:');
    console.log('- Vans Old Skool Red Size 10: 4 pieces in stock');
    console.log('- Vans Old Skool Red Size 9: 3 pieces in stock');
    console.log('- Nike Air Jordan 1 Size 10: 2 pieces in stock');
    console.log('- Converse Chuck Taylor Size 8: 4 pieces in stock');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 