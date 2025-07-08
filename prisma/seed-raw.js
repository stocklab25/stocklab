const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting raw SQL database seeding...');
  
  try {
    // Create users using raw SQL
    console.log('Creating users...');
    await prisma.$executeRaw`
      INSERT INTO "users" ("id", "email", "name", "password", "role", "createdAt", "updatedAt")
      VALUES 
        ('user1', 'admin@stocklab.com', 'Admin User', '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1m', 'ADMIN', NOW(), NOW()),
        ('user2', 'user@stocklab.com', 'Regular User', '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1m', 'USER', NOW(), NOW())
    `;
    console.log('✅ Users created');
    
    // Create products using raw SQL
    console.log('Creating products...');
    await prisma.$executeRaw`
      INSERT INTO "products" ("id", "brand", "name", "color", "sku", "cost", "payout", "quantity", "createdAt", "updatedAt")
      VALUES 
        ('prod1', 'Nike', 'Air Jordan 1 Retro High', 'Chicago', 'AJ1-CHI-001', 150.00, 200.00, 0, NOW(), NOW()),
        ('prod2', 'Adidas', 'Ultraboost 22', 'White', 'UB22-WHT-002', 120.00, 160.00, 0, NOW(), NOW()),
        ('prod3', 'Vans', 'Old Skool', 'Red', 'OS-RED-003', 40.00, 60.00, 0, NOW(), NOW())
    `;
    console.log('✅ Products created');
    
    // Create inventory items using raw SQL
    console.log('Creating inventory items...');
    await prisma.$executeRaw`
      INSERT INTO "inventory_items" ("id", "productId", "sku", "size", "condition", "cost", "consigner", "consignDate", "status", "location", "quantity", "createdAt", "updatedAt")
      VALUES 
        ('inv1', 'prod1', 'AJ1-CHI-10-001', '10', 'Excellent', 150.00, 'John Doe', '2024-01-15', 'InStock', 'Shelf A1', 2, NOW(), NOW()),
        ('inv2', 'prod2', 'UB22-WHT-9.5-002', '9.5', 'Good', 120.00, 'Jane Smith', '2024-01-20', 'InStock', 'Shelf B1', 1, NOW(), NOW()),
        ('inv3', 'prod3', 'OS-RED-10-003', '10', 'Fair', 40.00, 'Mike Johnson', '2024-01-25', 'InStock', 'Shelf C1', 3, NOW(), NOW())
    `;
    console.log('✅ Inventory items created');
    
    console.log('Database seeding completed successfully!');
    
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  }); 