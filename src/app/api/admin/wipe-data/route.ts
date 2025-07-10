import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Auth check function
function checkAuth(req: NextRequest): { user: User | null; isValid: boolean } {
  // Check for auth token in headers
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = verifyToken(token);
    return { user, isValid: !!user };
  }
  
  // Check for auth token in cookies
  const authCookie = req.cookies.get('authToken')?.value;
  if (authCookie) {
    const user = verifyToken(authCookie);
    return { user, isValid: !!user };
  }
  
  return { user: null, isValid: false };
}

export async function POST(req: NextRequest) {
  // Check authentication
  const { user, isValid } = checkAuth(req);
  if (!isValid || !user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  // Check if user is admin
  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    );
  }

  try {
    // Get confirmation from request body
    const { confirm } = await req.json();
    
    if (!confirm) {
      return NextResponse.json(
        { error: 'Confirmation required to wipe data' },
        { status: 400 }
      );
    }

    // Wipe all data in the correct order (respecting foreign key constraints)
    console.log('🧹 Starting data wipe process...');
    
    // 1. Delete all sales
    const deletedSales = await prisma.sale.deleteMany({});
    console.log(`🗑️ Deleted ${deletedSales.count} sales`);
    
    // 2. Delete all purchases
    const deletedPurchases = await prisma.purchase.deleteMany({});
    console.log(`🗑️ Deleted ${deletedPurchases.count} purchases`);
    
    // 3. Delete all store inventory
    const deletedStoreInventory = await prisma.storeInventory.deleteMany({});
    console.log(`🗑️ Deleted ${deletedStoreInventory.count} store inventory items`);
    
    // 4. Delete all stock transactions
    const deletedTransactions = await prisma.stockTransaction.deleteMany({});
    console.log(`🗑️ Deleted ${deletedTransactions.count} transactions`);
    
    // 5. Delete all inventory items
    const deletedInventoryItems = await prisma.inventoryItem.deleteMany({});
    console.log(`🗑️ Deleted ${deletedInventoryItems.count} inventory items`);
    
    // 6. Delete all stores
    const deletedStores = await prisma.store.deleteMany({});
    console.log(`🗑️ Deleted ${deletedStores.count} stores`);
    
    // 7. Delete all products
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`🗑️ Deleted ${deletedProducts.count} products`);
    
    // Note: We don't delete users as they are needed for the system to function
    
    const totalDeleted = deletedSales.count + deletedPurchases.count + deletedStoreInventory.count + 
                        deletedTransactions.count + deletedInventoryItems.count + deletedStores.count + 
                        deletedProducts.count;
    
    console.log('✅ Data wipe completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'All data has been wiped successfully (users preserved)',
      deleted: {
        sales: deletedSales.count,
        purchases: deletedPurchases.count,
        storeInventory: deletedStoreInventory.count,
        transactions: deletedTransactions.count,
        inventoryItems: deletedInventoryItems.count,
        stores: deletedStores.count,
        products: deletedProducts.count,
        total: totalDeleted
      }
    });
    
  } catch (error) {
    console.error('Error wiping data:', error);
    return NextResponse.json(
      { error: 'Failed to wipe data' },
      { status: 500 }
    );
  }
} 