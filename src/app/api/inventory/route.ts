import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';
import { generateStockLabSku } from '@/utils/sku-generator';

export async function GET(req: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(req);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const purchaseOrderId = searchParams.get('purchaseOrderId');

    const where: any = {
      deletedAt: null,
      product: {
        deletedAt: null
      }
    };

    if (purchaseOrderId) {
      where.purchaseOrderId = purchaseOrderId;
    }

    let inventoryItems;
    try {
      inventoryItems = await prisma.inventoryItem.findMany({
        where,
        select: {
          id: true,
          productId: true,
          sku: true,
          size: true,
          condition: true,
          cost: true,
          status: true,
          quantity: true,
          note: true,
          purchaseOrderId: true,
          createdAt: true,
          updatedAt: true,
          product: {
            select: {
              id: true,
              brand: true,
              name: true,
              sku: true,
              stocklabSku: true,
              createdAt: true,
              updatedAt: true
            }
          },
          purchaseOrder: {
            select: {
              id: true,
              vendorName: true,
              orderNumber: true,
              orderDate: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      if (errorMessage.includes('prepared statement') || errorMessage.includes('connection')) {
        await prisma.$disconnect();
        await prisma.$connect();
        // Retry once
        inventoryItems = await prisma.inventoryItem.findMany({
          where,
          select: {
            id: true,
            productId: true,
            sku: true,
            size: true,
            condition: true,
            cost: true,
            status: true,
            quantity: true,
            note: true,
            purchaseOrderId: true,
            createdAt: true,
            updatedAt: true,
            product: {
              select: {
                id: true,
                brand: true,
                name: true,
                sku: true,
                stocklabSku: true,
                createdAt: true,
                updatedAt: true
              }
            },
            purchaseOrder: {
              select: {
                id: true,
                vendorName: true,
                orderNumber: true,
                orderDate: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else {
        throw dbError;
      }
    }
    
    return NextResponse.json({
      data: inventoryItems,
      success: true
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(req);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const data = await req.json();
    
    // Validate required fields
    if (!data.productId || !data.sku || !data.size || !data.condition || !data.cost || !data.status) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, sku, size, condition, cost, status' },
        { status: 400 }
      );
    }
    
    // Generate StockLab SKU for the product if it doesn't have one
    let productStocklabSku = null;
    const existingProduct = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { stocklabSku: true }
    });
    
    if (!existingProduct?.stocklabSku) {
      productStocklabSku = await generateStockLabSku();
      await prisma.product.update({
        where: { id: data.productId },
        data: { stocklabSku: productStocklabSku }
      });
    }
    
    // Create inventory item
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        productId: data.productId,
        sku: data.sku,
        size: data.size,
        condition: data.condition,
        cost: parseFloat(data.cost),
        status: data.status,
        quantity: data.quantity || 1,
        purchaseOrderId: data.purchaseOrderId || null,
      },
      include: {
        product: true,
        purchaseOrder: true,
      }
    });

    // Create initial stock transaction
    const transaction = await prisma.stockTransaction.create({
      data: {
        type: 'IN',
        quantity: inventoryItem.quantity,
        date: new Date(),
        notes: `Initial stock in - ${inventoryItem.product.name} ${inventoryItem.size} (${inventoryItem.condition})`,
        inventoryItemId: inventoryItem.id,
        userId: null,
      },
      include: {
        InventoryItem: {
          include: {
            product: true
          }
        }
      }
    });

    return NextResponse.json({
      data: inventoryItem,
      transaction: transaction,
      success: true,
      message: 'Inventory item created with StockLab SKU'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
} 
