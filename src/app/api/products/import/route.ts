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

    const { products } = await request.json();

    if (!Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Products must be an array' },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const productData of products) {
      try {
        // Validate required fields
        if (!productData.brand || !productData.name) {
          results.errors.push(`Product missing brand or name: ${JSON.stringify(productData)}`);
          results.skipped++;
          continue;
        }

        // Check if product already exists (by SKU if provided, or by brand+name+color)
        let existingProduct = null;
        if (productData.sku) {
          existingProduct = await prisma.product.findFirst({
            where: {
              sku: productData.sku,
              deletedAt: null,
            },
          });
        } else {
          existingProduct = await prisma.product.findFirst({
            where: {
              brand: productData.brand,
              name: productData.name,
              color: productData.color || null,
              deletedAt: null,
            },
          });
        }

        if (existingProduct) {
          results.skipped++;
          continue;
        }

        // Create the product
        await prisma.product.create({
          data: {
            brand: productData.brand,
            name: productData.name,
            color: productData.color,
            sku: productData.sku,
            itemType: productData.itemType || 'SHOE',
          },
        });

        results.created++;
      } catch (error) {
        console.error('Error creating product:', error);
        results.errors.push(`Failed to create product: ${JSON.stringify(productData)}`);
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. Created: ${results.created}, Skipped: ${results.skipped}`,
      results,
    });
  } catch (error) {
    console.error('Error importing products:', error);
    return NextResponse.json(
      { error: 'Failed to import products' },
      { status: 500 }
    );
  }
} 