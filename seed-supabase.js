const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = 'https://ikehagqphpbpkbgynrvc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZWhhZ3FwaHBicGtiZ3lucnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDQ3MjUsImV4cCI6MjA2NzIyMDcyNX0.ApP-PIxxws3MC60R30d88jhWQmHAPDnuPYO7ehPMHp0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Hash password for users
    const hashedPassword = await hashPassword('password123');

    // Seed users
    console.log('Creating users...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .upsert({
        email: 'admin@stocklab.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN'
      }, { onConflict: 'email' })
      .select()
      .single();

    if (adminError) {
      console.error('Error creating admin user:', adminError);
      return;
    }

    const { data: regularUser, error: userError } = await supabase
      .from('users')
      .upsert({
        email: 'user@stocklab.com',
        name: 'Regular User',
        password: hashedPassword,
        role: 'USER'
      }, { onConflict: 'email' })
      .select()
      .single();

    if (userError) {
      console.error('Error creating regular user:', userError);
      return;
    }

    console.log('✅ Users created successfully');

    // Seed products
    console.log('Creating products...');
    const products = [
      {
        brand: 'Nike',
        name: 'Air Jordan 1',
        color: 'Red',
        sku: 'prod1',
        quantity: 10
      },
      {
        brand: 'Adidas',
        name: 'Ultraboost',
        color: 'Black',
        sku: 'prod2',
        quantity: 15
      },
      {
        brand: 'Puma',
        name: 'RS-X',
        color: 'White',
        sku: 'prod3',
        quantity: 8
      },
      {
        brand: 'Converse',
        name: 'Chuck Taylor',
        color: 'Navy',
        sku: 'prod4',
        quantity: 20
      },
      {
        brand: 'Vans',
        name: 'Old Skool',
        color: 'Black',
        sku: 'prod5',
        quantity: 12
      }
    ];

    const { data: createdProducts, error: productsError } = await supabase
      .from('products')
      .upsert(products, { onConflict: 'sku' })
      .select();

    if (productsError) {
      console.error('Error creating products:', productsError);
      return;
    }

    console.log('✅ Products created successfully');

    // Seed inventory items
    console.log('Creating inventory items...');
    const inventoryItems = [
      {
        productId: createdProducts[0].id,
        sku: 'inv1',
        size: '10',
        condition: 'New',
        cost: 150.00,
        consigner: 'John Doe',
        consignDate: new Date().toISOString(),
        status: 'InStock',
        location: 'Warehouse A'
      },
      {
        productId: createdProducts[1].id,
        sku: 'inv2',
        size: '9',
        condition: 'Like New',
        cost: 120.00,
        consigner: 'Jane Smith',
        consignDate: new Date().toISOString(),
        status: 'InStock',
        location: 'Warehouse B'
      }
    ];

    const { data: createdInventory, error: inventoryError } = await supabase
      .from('inventory_items')
      .upsert(inventoryItems, { onConflict: 'sku' })
      .select();

    if (inventoryError) {
      console.error('Error creating inventory items:', inventoryError);
      return;
    }

    console.log('✅ Inventory items created successfully');

    // Seed transactions
    console.log('Creating transactions...');
    const transactions = [
      {
        type: 'IN',
        quantity: 5,
        date: new Date().toISOString(),
        fromLocation: 'Supplier',
        toLocation: 'Warehouse A',
        userId: adminUser.id,
        notes: 'Initial stock',
        productId: createdProducts[0].id,
        inventoryItemId: createdInventory[0].id
      },
      {
        type: 'OUT',
        quantity: 2,
        date: new Date().toISOString(),
        fromLocation: 'Warehouse A',
        toLocation: 'Customer',
        userId: regularUser.id,
        notes: 'Sale',
        productId: createdProducts[0].id,
        inventoryItemId: createdInventory[0].id
      }
    ];

    const { data: createdTransactions, error: transactionsError } = await supabase
      .from('stock_transactions')
      .insert(transactions)
      .select();

    if (transactionsError) {
      console.error('Error creating transactions:', transactionsError);
      return;
    }

    console.log('✅ Transactions created successfully');
    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
  }
}

seedDatabase(); 