import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db';

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

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { user, isValid } = checkAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have at least a header and one data row' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1);

    const results = {
      transactionsCreated: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const values = row.split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        results.errors.push(`Row ${i + 2}: Invalid number of columns`);
        continue;
      }

      const rowData: any = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index];
      });

      try {
        // Validate required fields
        if (!rowData.Type || !rowData.Quantity || !rowData.Date || !rowData.InventoryItemSKU || !rowData.InventoryItemSize || !rowData.InventoryItemCondition) {
          results.errors.push(`Row ${i + 2}: Missing required fields (Type, Quantity, Date, InventoryItemSKU, InventoryItemSize, InventoryItemCondition)`);
          continue;
        }

        // Validate transaction type (excluding IN as it's handled in Inventory)
        const validTypes = ['OUT', 'MOVE', 'RETURN', 'ADJUSTMENT', 'AUDIT', 'TRANSFER_TO_STORE', 'TRANSFER_FROM_STORE', 'SALE_AT_STORE'];
        if (!validTypes.includes(rowData.Type.toUpperCase())) {
          results.errors.push(`Row ${i + 2}: Invalid transaction type. Must be one of: ${validTypes.join(', ')}. Note: IN transactions are handled through the Inventory system.`);
          continue;
        }

        // Validate condition
        const validConditions = ['NEW', 'PRE_OWNED'];
        if (!validConditions.includes(rowData.InventoryItemCondition.toUpperCase())) {
          results.errors.push(`Row ${i + 2}: Invalid condition. Must be one of: ${validConditions.join(', ')}`);
          continue;
        }

        // Validate quantity
        const quantity = parseInt(rowData.Quantity);
        if (isNaN(quantity) || quantity <= 0) {
          results.errors.push(`Row ${i + 2}: Invalid quantity. Must be a positive number`);
          continue;
        }

        // Validate date
        const transactionDate = new Date(rowData.Date);
        if (isNaN(transactionDate.getTime())) {
          results.errors.push(`Row ${i + 2}: Invalid date format. Use YYYY-MM-DD`);
          continue;
        }

        // Find inventory item by SKU, size, and condition
        const inventoryItem = await prisma.inventoryItem.findFirst({
          where: {
            sku: rowData.InventoryItemSKU,
            size: rowData.InventoryItemSize,
            condition: rowData.InventoryItemCondition.toUpperCase() as any,
            deletedAt: null,
          },
          include: {
            product: true
          }
        });

        if (!inventoryItem) {
          results.errors.push(`Row ${i + 2}: Inventory item not found with SKU: ${rowData.InventoryItemSKU}, Size: ${rowData.InventoryItemSize}, Condition: ${rowData.InventoryItemCondition}`);
          continue;
        }

        // Find stores if provided
        let fromStoreId = null;
        let toStoreId = null;

        if (rowData.FromStore) {
          const fromStore = await prisma.store.findFirst({
            where: {
              name: { contains: rowData.FromStore, mode: 'insensitive' },
              deletedAt: null
            }
          });
          if (fromStore) {
            fromStoreId = fromStore.id;
          } else {
            results.errors.push(`Row ${i + 2}: From store not found: ${rowData.FromStore}`);
            continue;
          }
        }

        if (rowData.ToStore) {
          const toStore = await prisma.store.findFirst({
            where: {
              name: { contains: rowData.ToStore, mode: 'insensitive' },
              deletedAt: null
            }
          });
          if (toStore) {
            toStoreId = toStore.id;
          } else {
            results.errors.push(`Row ${i + 2}: To store not found: ${rowData.ToStore}`);
            continue;
          }
        }

        // Create transaction and update inventory in a transaction
        const result = await prisma.$transaction(async (tx) => {
          // For transactions that decrease warehouse inventory, check if we have enough stock
          if ((rowData.Type.toUpperCase() === 'OUT' || rowData.Type.toUpperCase() === 'TRANSFER_TO_STORE') && inventoryItem.quantity < quantity) {
            throw new Error(`Insufficient stock. Available: ${inventoryItem.quantity}, Requested: ${quantity}`);
          }

          // Calculate new inventory quantity based on transaction type
          let newQuantity = inventoryItem.quantity;
          switch (rowData.Type.toUpperCase()) {
            case 'OUT':
              newQuantity -= quantity;
              break;
            case 'ADJUSTMENT':
              newQuantity = quantity; // Direct adjustment
              break;
            case 'TRANSFER_TO_STORE':
              newQuantity -= quantity; // Decrease warehouse inventory
              break;
            default:
              // For other types (MOVE, RETURN, AUDIT, TRANSFER_FROM_STORE, SALE_AT_STORE), don't change warehouse quantity
              break;
          }

          // Ensure quantity doesn't go negative
          if (newQuantity < 0) {
            throw new Error('Transaction would result in negative stock');
          }

          // Create the transaction
          const transaction = await tx.stockTransaction.create({
            data: {
              type: rowData.Type.toUpperCase() as any,
              quantity: quantity,
              date: transactionDate,
              notes: rowData.Notes || undefined,
              inventoryItemId: inventoryItem.id,
              fromStoreId: fromStoreId,
              toStoreId: toStoreId,
              userId: dbUser.id,
            },
            include: {
              InventoryItem: {
                include: {
                  product: true
                }
              },
              fromStore: true,
              toStore: true,
              user: true
            }
          });

          // Update inventory item quantity
          await tx.inventoryItem.update({
            where: { id: inventoryItem.id },
            data: { quantity: newQuantity }
          });

          // Update store inventory based on transaction type
          if (rowData.Type.toUpperCase() === 'TRANSFER_TO_STORE' && toStoreId) {
            // Add to destination store inventory
            const existingStoreInventory = await tx.storeInventory.findUnique({
              where: {
                storeId_inventoryItemId: {
                  storeId: toStoreId,
                  inventoryItemId: inventoryItem.id
                }
              }
            });

            if (existingStoreInventory) {
              await tx.storeInventory.update({
                where: {
                  storeId_inventoryItemId: {
                    storeId: toStoreId,
                    inventoryItemId: inventoryItem.id
                  }
                },
                data: {
                  quantity: {
                    increment: quantity
                  }
                }
              });
            } else {
              await tx.storeInventory.create({
                data: {
                  storeId: toStoreId,
                  inventoryItemId: inventoryItem.id,
                  quantity
                }
              });
            }
          } else if (rowData.Type.toUpperCase() === 'TRANSFER_FROM_STORE' && fromStoreId) {
            // Deduct from source store inventory
            const existingStoreInventory = await tx.storeInventory.findUnique({
              where: {
                storeId_inventoryItemId: {
                  storeId: fromStoreId,
                  inventoryItemId: inventoryItem.id
                }
              }
            });

            if (existingStoreInventory) {
              if (existingStoreInventory.quantity < quantity) {
                throw new Error(`Insufficient stock in store. Available: ${existingStoreInventory.quantity}, Requested: ${quantity}`);
              }
              await tx.storeInventory.update({
                where: {
                  storeId_inventoryItemId: {
                    storeId: fromStoreId,
                    inventoryItemId: inventoryItem.id
                  }
                },
                data: {
                  quantity: {
                    decrement: quantity
                  }
                }
              });
            } else {
              throw new Error(`No inventory found in store for this item`);
            }
          } else if (rowData.Type.toUpperCase() === 'SALE_AT_STORE' && toStoreId) {
            // Deduct from store inventory for sales
            const existingStoreInventory = await tx.storeInventory.findUnique({
              where: {
                storeId_inventoryItemId: {
                  storeId: toStoreId,
                  inventoryItemId: inventoryItem.id
                }
              }
            });

            if (existingStoreInventory) {
              if (existingStoreInventory.quantity < quantity) {
                throw new Error(`Insufficient stock in store for sale. Available: ${existingStoreInventory.quantity}, Requested: ${quantity}`);
              }
              await tx.storeInventory.update({
                where: {
                  storeId_inventoryItemId: {
                    storeId: toStoreId,
                    inventoryItemId: inventoryItem.id
                  }
                },
                data: {
                  quantity: {
                    decrement: quantity
                  }
                }
              });
            } else {
              throw new Error(`No inventory found in store for this sale`);
            }
          }

          return transaction;
        });

        results.transactionsCreated++;

      } catch (error: any) {
        results.errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import transactions', details: error.message },
      { status: 500 }
    );
  }
} 