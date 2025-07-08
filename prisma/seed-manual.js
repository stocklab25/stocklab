const { PrismaClient } = require('@prisma/client');

async function createUser(userData) {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.create({ data: userData });
    console.log(`Created user: ${user.email}`);
    return user;
  } finally {
    await prisma.$disconnect();
  }
}

async function createProduct(productData) {
  const prisma = new PrismaClient();
  try {
    const product = await prisma.product.create({ data: productData });
    console.log(`Created product: ${product.brand} ${product.name}`);
    return product;
  } finally {
    await prisma.$disconnect();
  }
}

async function createInventoryItem(itemData) {
  const prisma = new PrismaClient();
  try {
    const item = await prisma.inventoryItem.create({ data: itemData });
    console.log(`Created inventory item: ${item.sku}`);
    return item;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('Starting manual database seeding...');
  
  try {
    // Create users
    console.log('Creating users...');
    const adminUser = await createUser({
      email: 'admin@stocklab.com',
      name: 'Admin User',
      password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1m', // password123
      role: 'ADMIN'
    });
    
    const regularUser = await createUser({
      email: 'user@stocklab.com',
      name: 'Regular User',
      password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1m', // password123
      role: 'USER'
    });
    
    // Create products
    console.log('Creating products...');
    const product1 = await createProduct({
      brand: 'Nike',
      name: 'Air Jordan 1 Retro High',
      color: 'Chicago',
      sku: 'AJ1-CHI-001',
      cost: 150.00,
      payout: 200.00,
      quantity: 0
    });
    
    const product2 = await createProduct({
      brand: 'Adidas',
      name: 'Ultraboost 22',
      color: 'White',
      sku: 'UB22-WHT-002',
      cost: 120.00,
      payout: 160.00,
      quantity: 0
    });
    
    const product3 = await createProduct({
      brand: 'Vans',
      name: 'Old Skool',
      color: 'Red',
      sku: 'OS-RED-003',
      cost: 40.00,
      payout: 60.00,
      quantity: 0
    });
    
    // Create inventory items
    console.log('Creating inventory items...');
    await createInventoryItem({
      productId: product1.id,
      sku: 'AJ1-CHI-10-001',
      size: '10',
      condition: 'Excellent',
      cost: 150.00,
      consigner: 'John Doe',
      consignDate: new Date('2024-01-15'),
      status: 'InStock',
      location: 'Shelf A1',
      quantity: 2
    });
    
    await createInventoryItem({
      productId: product2.id,
      sku: 'UB22-WHT-9.5-002',
      size: '9.5',
      condition: 'Good',
      cost: 120.00,
      consigner: 'Jane Smith',
      consignDate: new Date('2024-01-20'),
      status: 'InStock',
      location: 'Shelf B1',
      quantity: 1
    });
    
    await createInventoryItem({
      productId: product3.id,
      sku: 'OS-RED-10-003',
      size: '10',
      condition: 'Fair',
      cost: 40.00,
      consigner: 'Mike Johnson',
      consignDate: new Date('2024-01-25'),
      status: 'InStock',
      location: 'Shelf C1',
      quantity: 3
    });
    
    console.log('Database seeding completed successfully!');
    
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  }); 