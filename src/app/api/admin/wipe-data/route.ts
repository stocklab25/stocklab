import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(req);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }



    const { confirm } = await req.json();

    if (confirm !== 'WIPE ALL DATA') {
      return NextResponse.json(
        { error: 'Confirmation message does not match. Please type "WIPE ALL DATA" exactly.' },
        { status: 400 }
      );
    }

    // Wipe all data (except users) - using individual operations to avoid transaction timeouts
    console.log('Starting data wipe...');
    
    // Delete in reverse order of dependencies
    await prisma.transaction_order_items.deleteMany({});
    console.log('Deleted transaction_order_items');
    
    await prisma.transaction_orders.deleteMany({});
    console.log('Deleted transaction_orders');
    
    await prisma.purchaseOrderItem.deleteMany({});
    console.log('Deleted purchaseOrderItem');
    
    await prisma.purchaseOrder.deleteMany({});
    console.log('Deleted purchaseOrder');
    
    await prisma.accounting.deleteMany({});
    console.log('Deleted accounting');
    
    await prisma.expense.deleteMany({});
    console.log('Deleted expense');
    
    await prisma.sale.deleteMany({});
    console.log('Deleted sale');
    
    await prisma.stockTransaction.deleteMany({});
    console.log('Deleted stockTransaction');
    
    await prisma.purchase.deleteMany({});
    console.log('Deleted purchase');
    
    await prisma.storeInventory.deleteMany({});
    console.log('Deleted storeInventory');
    
    await prisma.inventoryItem.deleteMany({});
    console.log('Deleted inventoryItem');
    
    await prisma.product.deleteMany({});
    console.log('Deleted product');
    
    await prisma.store.deleteMany({});
    console.log('Deleted store');
    
    await prisma.card.deleteMany({});
    console.log('Deleted card');
    
    // Note: We don't delete users to preserve admin access

    return NextResponse.json({
      success: true,
      message: 'All data has been permanently deleted (users preserved)'
    });
  } catch (error) {
    console.error('Error wiping data:', error);
    return NextResponse.json(
      { error: 'Failed to wipe data' },
      { status: 500 }
    );
  }
} 
