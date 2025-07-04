import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

// Auth check function
function checkAuth(req: NextRequest): { user: any; isValid: boolean } {
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

export async function GET(req: NextRequest) {
  // Check authentication
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    const transactions = await prisma.stockTransaction.findMany({
      where: {
        deletedAt: null, // Only show non-deleted transactions
        product: {
          deletedAt: null // Only show transactions from non-deleted products
        }
      },
      include: {
        product: true,
        user: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    return NextResponse.json({
      data: transactions,
      success: true
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Check authentication
  const { user, isValid } = checkAuth(req);
  if (!isValid) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    const data = await req.json();
    
    // Validate required fields
    if (!data.type || !data.productId || !data.quantity || !data.date) {
      return NextResponse.json(
        { error: 'Missing required fields: type, productId, quantity, date' },
        { status: 400 }
      );
    }

    // Validate quantity is positive
    if (data.quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }

    // Get the product to check current quantity
    const product = await prisma.product.findUnique({
      where: { id: data.productId }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // For OUT transactions, check if we have enough stock
    if (data.type === 'OUT' && product.quantity < data.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${product.quantity}, Requested: ${data.quantity}` },
        { status: 400 }
      );
    }

    // Calculate new quantity based on transaction type
    let newQuantity = product.quantity;
    switch (data.type) {
      case 'IN':
        newQuantity += data.quantity;
        break;
      case 'OUT':
        newQuantity -= data.quantity;
        break;
      case 'ADJUSTMENT':
        newQuantity = data.quantity; // Direct adjustment
        break;
      default:
        // For other types (MOVE, RETURN, AUDIT), don't change quantity
        break;
    }

    // Ensure quantity doesn't go negative
    if (newQuantity < 0) {
      return NextResponse.json(
        { error: 'Transaction would result in negative stock' },
        { status: 400 }
      );
    }

    // Create the transaction
    const newTransaction = await prisma.stockTransaction.create({
      data: {
        productId: data.productId,
        inventoryItemId: data.inventoryItemId || null,
        type: data.type,
        quantity: data.quantity,
        date: new Date(data.date),
        fromLocation: data.fromLocation,
        toLocation: data.toLocation,
        userId: user.id, // Use the authenticated user's ID
        notes: data.notes,
      },
      include: {
        product: true,
        InventoryItem: true,
        user: true
      }
    });

    // Update product quantity
    await prisma.product.update({
      where: { id: data.productId },
      data: { quantity: newQuantity }
    });
    
    return NextResponse.json({
      data: newTransaction,
      success: true,
      newQuantity: newQuantity
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  // Check authentication
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const isHardDelete = searchParams.get('hard') === 'true';
    
    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Check if transaction exists and is not already deleted
    const existingTransaction = await prisma.stockTransaction.findFirst({
      where: { 
        id,
        deletedAt: null
      }
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found or already deleted' },
        { status: 404 }
      );
    }

    if (isHardDelete) {
      // Hard delete - permanently remove the transaction
      await prisma.stockTransaction.delete({
        where: { id }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Transaction permanently deleted'
      });
    } else {
      // Soft delete (archive) - just set deletedAt timestamp
      const deletedTransaction = await prisma.stockTransaction.update({
        where: { id },
        data: { 
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      return NextResponse.json({
        data: deletedTransaction,
        success: true,
        message: 'Transaction archived successfully'
      });
    }
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
} 