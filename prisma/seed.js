const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const mockProducts = [
  {
    brand: 'Nike',
    name: 'Air Jordan 1',
    color: 'Red/Black',
    sku: 'AJ1-RED-001',
    quantity: 5,
    cost: 120.00,
    payout: 180.00
  },
  {
    brand: 'Adidas',
    name: 'Ultraboost',
    color: 'White',
    sku: 'UB-WHT-001',
    quantity: 3,
    cost: 150.00,
    payout: 200.00
  },
  {
    brand: 'Converse',
    name: 'Chuck Taylor',
    color: 'Black',
    sku: 'CT-BLK-001',
    quantity: 10,
    cost: 50.00,
    payout: 75.00
  },
  {
    brand: 'Vans',
    name: 'Old Skool',
    color: 'Navy',
    sku: 'OS-NAV-001',
    quantity: 7,
    cost: 60.00,
    payout: 90.00
  },
  {
    brand: 'New Balance',
    name: '574',
    color: 'Grey',
    sku: 'NB-GRY-001',
    quantity: 4,
    cost: 80.00,
    payout: 120.00
  }
];

async function main() {
  console.log('Starting database seeding...');
  
  try {
    // Clear existing data (except users)
    console.log('Clearing existing data (except users)...');
    
    await prisma.stockTransaction.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.product.deleteMany();
    
    console.log('Existing data cleared successfully');
    
    // Create or update admin user
    console.log('Ensuring admin user exists and has correct password...');
    const hashedPassword = await bcrypt.hash('password123', 12);
    const adminEmail = 'admin@stocklab.com';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    let adminUser;
    if (existingAdmin) {
      adminUser = await prisma.user.update({
        where: { email: adminEmail },
        data: { password: hashedPassword, name: 'Admin User', role: 'ADMIN' }
      });
      console.log(`Updated password for existing admin user: ${adminUser.email}`);
    } else {
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Admin User',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      console.log(`Created admin user: ${adminUser.email}`);
    }
    
    // Create products and their inventory items
    console.log('Creating products with inventory...');
    const createdProducts = [];
    for (const productData of mockProducts) {
      // Create the product
      const product = await prisma.product.create({
        data: {
          brand: productData.brand,
          name: productData.name,
          color: productData.color,
          sku: productData.sku,
          quantity: productData.quantity,
          cost: productData.cost,
          payout: productData.payout,
          itemType: 'shoes',
        }
      });
      createdProducts.push(product);
      console.log(`Created product: ${product.brand} ${product.name} (Quantity: ${product.quantity})`);
      
      // If product has quantity > 0, create inventory items and initial stock transaction
      if (productData.quantity > 0) {
        console.log(`  Creating ${productData.quantity} inventory items for ${product.brand} ${product.name}...`);
        
        // Create inventory items
        const inventoryItems = [];
        for (let i = 0; i < productData.quantity; i++) {
          const inventoryItem = await prisma.inventoryItem.create({
            data: {
              productId: product.id,
              sku: `${product.sku}-ITEM-${i + 1}`,
              size: '10',
              condition: 'Good',
              cost: productData.cost,
              consigner: 'John Doe',
              consignDate: new Date(),
              status: 'InStock',
              location: 'Warehouse A'
            }
          });
          inventoryItems.push(inventoryItem);
        }
        
        // Create initial stock transaction
        const transaction = await prisma.stockTransaction.create({
          data: {
            type: 'IN',
            quantity: productData.quantity,
            date: new Date(),
            notes: 'Initial stock',
            productId: product.id,
            userId: adminUser.id // Use admin user
          }
        });
        
        console.log(`  Created ${inventoryItems.length} inventory items and initial stock transaction for ${product.brand} ${product.name}`);
      } else {
        console.log(`  No inventory items created for ${product.brand} ${product.name} (quantity: 0)`);
      }
    }
    
    console.log('Database seeding completed successfully!');
    console.log(`Admin user: ${adminUser.email} (password: password123)`);
    console.log(`Created ${createdProducts.length} products`);
    
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