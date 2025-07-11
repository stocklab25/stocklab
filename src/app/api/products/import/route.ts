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
    const products = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      // Skip empty rows (where all values are empty)
      if (values.every(v => !v)) {
        continue;
      }
      
      const product: any = {};
      
      headers.forEach((header, index) => {
        product[header] = values[index] || '';
      });
      
      products.push(product);
    }

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No products found in CSV file' },
        { status: 400 }
      );
    }

    const results = {
      productsCreated: 0,
      productsUpdated: 0,
      inventoryItemsCreated: 0,
      errors: [] as string[],
    };

    for (const productData of products) {
      try {
        // Normalize field names (case-insensitive)
        const normalizedData = {
          brand: productData.brand || productData.Brand,
          name: productData.name || productData.Name,
          color: productData.color || productData.Color,
          sku: productData.sku || productData.SKU,
          itemType: productData.itemType || productData.ItemType,
          size: productData.size || productData.Size,
          condition: productData.condition || productData.Condition,
          quantity: productData.quantity || productData.Quantity,
          cost: productData.cost || productData.Cost,
          vendor: productData.vendor || productData.Vendor,
          paymentMethod: productData.paymentMethod || productData.PaymentMethod,
        };

        // Validate required fields
        if (!normalizedData.brand || !normalizedData.name) {
          results.errors.push(`Product missing brand or name: ${JSON.stringify(productData)}`);
          results.productsUpdated++;
          continue;
        }

        // Check if product already exists (by SKU if provided, or by brand+name+color)
        let existingProduct = null;
        if (normalizedData.sku) {
          existingProduct = await prisma.product.findFirst({
            where: {
              sku: normalizedData.sku,
              deletedAt: null,
            },
          });
        } else {
          existingProduct = await prisma.product.findFirst({
            where: {
              brand: normalizedData.brand,
              name: normalizedData.name,
              color: normalizedData.color || null,
              deletedAt: null,
            },
          });
        }

        if (existingProduct) {
          results.productsUpdated++;
          continue;
        }

        // Validate itemType
        const validItemTypes = ['SHOE', 'APPAREL', 'MERCH'];
        const itemType = normalizedData.itemType || 'SHOE';
        if (!validItemTypes.includes(itemType.toUpperCase())) {
          results.errors.push(`Invalid itemType: ${itemType}. Must be one of: ${validItemTypes.join(', ')}`);
          results.productsUpdated++;
          continue;
        }

        // Create the product
        const createdProduct = await prisma.product.create({
          data: {
            brand: normalizedData.brand,
            name: normalizedData.name,
            color: normalizedData.color,
            sku: normalizedData.sku,
            itemType: itemType.toUpperCase() as 'SHOE' | 'APPAREL' | 'MERCH',
          },
        });

        results.productsCreated++;

        // Create inventory item if inventory fields are provided
        if (normalizedData.size && normalizedData.cost && normalizedData.condition) {
          try {
            // Generate unique SKU for inventory item if not provided
            const inventorySku = normalizedData.sku || `${createdProduct.brand}-${createdProduct.name}-${normalizedData.size}`;
            
            // Validate condition
            const validConditions = ['NEW', 'PRE_OWNED'];
            const condition = normalizedData.condition.toUpperCase();
            if (!validConditions.includes(condition)) {
              results.errors.push(`Invalid condition: ${normalizedData.condition}. Must be one of: ${validConditions.join(', ')}`);
              continue;
            }

            // Validate status (default to InStock)
            const status = 'InStock';

            await prisma.inventoryItem.create({
              data: {
                productId: createdProduct.id,
                sku: inventorySku,
                size: normalizedData.size,
                cost: parseFloat(normalizedData.cost),
                status,
                quantity: parseInt(normalizedData.quantity) || 1,
                condition: condition as 'NEW' | 'PRE_OWNED',
              },
            });

            results.inventoryItemsCreated++;
          } catch (inventoryError) {
            console.error('Error creating inventory item:', inventoryError);
            results.errors.push(`Failed to create inventory item for product: ${JSON.stringify(productData)} - ${inventoryError instanceof Error ? inventoryError.message : 'Unknown error'}`);
          }
        }
      } catch (error) {
        console.error('Error creating product:', error);
        results.errors.push(`Failed to create product: ${JSON.stringify(productData)} - ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.productsUpdated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. Created: ${results.productsCreated}, Updated: ${results.productsUpdated}`,
      results,
    });
  } catch (error) {
    console.error('Products import error:', error);
    return NextResponse.json(
      { error: 'Failed to import products', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
