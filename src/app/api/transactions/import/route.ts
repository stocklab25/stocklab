import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Parse FormData to get the file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read and parse CSV file
    const fileBuffer = await file.arrayBuffer();
    const fileString = new TextDecoder().decode(fileBuffer);
    
    // Simple CSV parsing (split by lines and commas)
    const lines = fileString.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must have at least a header row and one data row' },
        { status: 400 }
      );
    }

    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim());
    const transactions = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      // Skip empty rows (where all values are empty)
      if (values.every(v => !v)) {
        continue;
      }
      
      const transaction: any = {};
      
      headers.forEach((header, index) => {
        transaction[header] = values[index] || '';
      });
      
      transactions.push(transaction);
    }

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found in CSV file' },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < transactions.length; i++) {
      const transactionData = transactions[i];
      try {
        // Normalize field names (case-insensitive)
        const normalizedData = {
          type: transactionData.type || transactionData.Type,
          quantity: transactionData.quantity || transactionData.Quantity,
          date: transactionData.date || transactionData.Date,
          notes: transactionData.notes || transactionData.Notes,
          fromStore: transactionData.fromStore || transactionData['FromStore'] || transactionData['From Store'],
          toStore: transactionData.toStore || transactionData['ToStore'] || transactionData['To Store'],
          // Inventory item fields
          inventoryItemSku: transactionData.inventoryItemSku || transactionData['InventoryItemSKU'] || transactionData['Inventory Item SKU'],
          inventoryItemSize: transactionData.inventoryItemSize || transactionData['InventoryItemSize'] || transactionData['Inventory Item Size'],
          inventoryItemCondition: transactionData.inventoryItemCondition || transactionData['InventoryItemCondition'] || transactionData['Inventory Item Condition'],
          // Direct ID (if provided)
          inventoryItemId: transactionData.inventoryItemId || transactionData['Inventory Item ID'],
        };



        // Validate required fields
        if (!normalizedData.type || !normalizedData.quantity) {
          results.errors.push(`Row ${i + 1}: Missing required fields`);
          results.skipped++;
          continue;
        }

        // Find inventory item by SKU, size, and condition if not provided by ID
        let inventoryItem = null;
        if (normalizedData.inventoryItemId) {
          inventoryItem = await prisma.inventoryItem.findUnique({
            where: { id: normalizedData.inventoryItemId },
          });
        } else if (normalizedData.inventoryItemSku && normalizedData.inventoryItemSize && normalizedData.inventoryItemCondition) {
          // Find by SKU, size, and condition
          inventoryItem = await prisma.inventoryItem.findFirst({
            where: {
              sku: normalizedData.inventoryItemSku,
              size: normalizedData.inventoryItemSize,
              condition: normalizedData.inventoryItemCondition.toUpperCase() as 'NEW' | 'PRE_OWNED',
              deletedAt: null,
            },
          });
        }

        if (!inventoryItem) {
          results.errors.push(`Row ${i + 1}: Inventory item not found`);
          results.skipped++;
          continue;
        }

        // Validate transaction type
        const validTypes = ['IN', 'OUT', 'MOVE', 'RETURN', 'ADJUSTMENT', 'AUDIT', 'TRANSFER_TO_STORE', 'TRANSFER_FROM_STORE', 'SALE_AT_STORE'];
        if (!validTypes.includes(normalizedData.type.toUpperCase())) {
          results.errors.push(`Row ${i + 1}: Invalid transaction type`);
          results.skipped++;
          continue;
        }

        // Find stores by name if provided
        let fromStoreId = null;
        let toStoreId = null;

        if (normalizedData.fromStore) {
          const fromStore = await prisma.store.findFirst({
            where: {
              name: normalizedData.fromStore,
              deletedAt: null,
            },
          });
          fromStoreId = fromStore?.id || null;
        }

        if (normalizedData.toStore) {
          const toStore = await prisma.store.findFirst({
            where: {
              name: normalizedData.toStore,
              deletedAt: null,
            },
          });
          toStoreId = toStore?.id || null;
        }

        // Create the transaction
        await prisma.stockTransaction.create({
          data: {
            inventoryItemId: inventoryItem.id,
            type: normalizedData.type.toUpperCase() as any,
            quantity: parseInt(normalizedData.quantity),
            date: normalizedData.date ? new Date(normalizedData.date) : new Date(),
            notes: normalizedData.notes,
            fromStoreId: fromStoreId,
            toStoreId: toStoreId,
            userId: null, // Set to null to avoid foreign key constraint
          },
        });

        // Update inventory item quantity based on transaction type
        const transactionType = normalizedData.type.toUpperCase();
        const quantity = parseInt(normalizedData.quantity);
        
        let quantityChange = 0;
        
        switch (transactionType) {
          case 'IN':
          case 'RETURN':
            quantityChange = quantity; // Increase quantity
            break;
          case 'OUT':
          case 'TRANSFER_TO_STORE':
          case 'TRANSFER_FROM_STORE':
          case 'SALE_AT_STORE':
            quantityChange = -quantity; // Decrease quantity
            break;
          case 'MOVE':
          case 'ADJUSTMENT':
          case 'AUDIT':
            // These don't change the total quantity, just move it around
            quantityChange = 0;
            break;
          default:
            quantityChange = 0;
        }

        // Check if transaction would make inventory negative
        if (quantityChange < 0) {
          const currentQuantity = inventoryItem.quantity;
          const newQuantity = currentQuantity + quantityChange;
          
          if (newQuantity < 0) {
            results.errors.push(`Row ${i + 1}: Would make inventory negative`);
            results.skipped++;
            continue;
          }
        }

        // Check store inventory for store-specific transactions
        if (transactionType === 'TRANSFER_FROM_STORE' && fromStoreId) {
          const storeInventory = await prisma.storeInventory.findUnique({
            where: {
              storeId_inventoryItemId: {
                storeId: fromStoreId,
                inventoryItemId: inventoryItem.id
              }
            }
          });
          
          if (storeInventory && storeInventory.quantity < quantity) {
            results.errors.push(`Row ${i + 1}: Would make store inventory negative`);
            results.skipped++;
            continue;
          }
        } else if (transactionType === 'SALE_AT_STORE' && toStoreId) {
          const storeInventory = await prisma.storeInventory.findUnique({
            where: {
              storeId_inventoryItemId: {
                storeId: toStoreId,
                inventoryItemId: inventoryItem.id
              }
            }
          });
          
          if (storeInventory && storeInventory.quantity < quantity) {
            results.errors.push(`Row ${i + 1}: Would make store inventory negative`);
            results.skipped++;
            continue;
          }
        }

        if (quantityChange !== 0) {
          await prisma.inventoryItem.update({
            where: { id: inventoryItem.id },
            data: {
              quantity: {
                increment: quantityChange
              }
            }
          });
        }

        // Update store inventory for store transfers
        if (transactionType === 'TRANSFER_TO_STORE' && toStoreId) {
          // Decrease from warehouse, increase at store
          await prisma.storeInventory.upsert({
            where: {
              storeId_inventoryItemId: {
                storeId: toStoreId,
                inventoryItemId: inventoryItem.id
              }
            },
            update: {
              quantity: {
                increment: quantity
              }
            },
            create: {
              storeId: toStoreId,
              inventoryItemId: inventoryItem.id,
              quantity: quantity
            }
          });
        } else if (transactionType === 'TRANSFER_FROM_STORE' && fromStoreId) {
          // Decrease from store, increase at warehouse
          await prisma.storeInventory.upsert({
            where: {
              storeId_inventoryItemId: {
                storeId: fromStoreId,
                inventoryItemId: inventoryItem.id
              }
            },
            update: {
              quantity: {
                decrement: quantity
              }
            },
            create: {
              storeId: fromStoreId,
              inventoryItemId: inventoryItem.id,
              quantity: 0 // If creating new record, start with 0 then decrement
            }
          });
        } else if (transactionType === 'SALE_AT_STORE' && toStoreId) {
          // Decrease from store when item is sold at store
          await prisma.storeInventory.update({
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
        }

        results.created++;
      } catch (error) {
        console.error('Error creating transaction:', error);
        results.errors.push(`Row ${i + 1}: Failed to create transaction`);
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. Created: ${results.created}, Skipped: ${results.skipped}`,
      results,
    });
  } catch (error) {
    console.error('Transactions import error:', error);
    return NextResponse.json(
      { error: 'Failed to import transactions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
