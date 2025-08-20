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
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < products.length; i++) {
      const productData = products[i];
      try {
        // Normalize field names (case-insensitive)
        const normalizedData = {
          brand: productData.brand || productData.Brand,
          name: productData.name || productData.Name,
          sku: productData.sku || productData.SKU || productData.Sku,
          itemType: productData.itemType || productData['Item Type'] || productData['ItemType'] || productData.type || productData.Type,
        };

        // Validate required fields
        if (!normalizedData.brand || !normalizedData.name) {
          results.errors.push(`Row ${i + 1}: Missing required fields (brand and name are required)`);
          results.skipped++;
          continue;
        }

        // Check if SKU already exists (if provided)
        if (normalizedData.sku) {
          const existingProduct = await prisma.product.findFirst({
            where: {
              sku: normalizedData.sku,
              deletedAt: null,
            },
          });

          if (existingProduct) {
            results.errors.push(`Row ${i + 1}: SKU "${normalizedData.sku}" already exists`);
            results.skipped++;
            continue;
          }
        }

        // Validate item type
        const validItemTypes = ['SHOE', 'APPAREL', 'ACCESSORIES'];
        if (normalizedData.itemType && !validItemTypes.includes(normalizedData.itemType.toUpperCase())) {
          results.errors.push(`Row ${i + 1}: Invalid item type "${normalizedData.itemType}". Must be one of: ${validItemTypes.join(', ')}`);
          results.skipped++;
          continue;
        }

        // Create the product
        await prisma.product.create({
          data: {
            brand: normalizedData.brand,
            name: normalizedData.name,
            sku: normalizedData.sku || undefined,
            itemType: normalizedData.itemType ? normalizedData.itemType.toUpperCase() : 'SHOE', // Default to SHOE
          },
        });

        results.created++;
      } catch (error: any) {
        results.errors.push(`Row ${i + 1}: ${error.message || 'Unknown error'}`);
        results.skipped++;
      }
    }

    return NextResponse.json({
      message: 'Products import completed',
      results,
    });
  } catch (error: any) {
    console.error('Products import error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
