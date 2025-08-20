import { ImportConfig } from '@/components/ImportModal';
import { useImportProducts } from '@/hooks/useImportProducts';
import { useImportInventory } from '@/hooks/useImportInventory';

// Products import configuration
export const getProductsImportConfig = (): ImportConfig => ({
  entityType: 'Products',
  title: 'Import Products',
  description: 'Import Products from CSV',
  fields: [
    {
      name: 'brand',
      label: 'Brand',
      required: true,
      description: 'Product brand name',
    },
    {
      name: 'name',
      label: 'Name',
      required: true,
      description: 'Product name',
    },
    {
      name: 'sku',
      label: 'SKU',
      required: false,
      description: 'Unique product SKU',
    },
    {
      name: 'itemType',
      label: 'Item Type',
      required: false,
      description: 'SHOE, APPAREL, or ACCESSORIES (defaults to SHOE)',
    },
  ],
  templateData: 'brand,name,sku,itemType\nJordan,Air Jordan 1 Retro High OG,123456,SHOE\nNike,Air Force 1 Low,789012,SHOE\nadidas,Ultraboost 22,345678,SHOE',
  importFunction: async (file: File) => {
    const { importProducts } = useImportProducts();
    const result = await importProducts(file);
    if (!result) {
      throw new Error('Failed to import products');
    }
    return result;
  },
});

// Inventory import configuration
export const getInventoryImportConfig = (): ImportConfig => ({
  entityType: 'Inventory Items',
  title: 'Import Inventory',
  description: 'Import Inventory Items from CSV',
  fields: [
    {
      name: 'productSku',
      label: 'Product SKU',
      required: true,
      description: 'SKU of the existing product',
    },
    {
      name: 'size',
      label: 'Size',
      required: true,
      description: 'Product size (e.g., 10, M, L)',
    },
    {
      name: 'condition',
      label: 'Condition',
      required: true,
      description: 'NEW, LIKE_NEW, GOOD, FAIR, or POOR',
    },
    {
      name: 'quantity',
      label: 'Quantity',
      required: true,
      description: 'Number of items in stock',
    },
    {
      name: 'cost',
      label: 'Cost',
      required: false,
      description: 'Cost per item',
    },
    {
      name: 'notes',
      label: 'Notes',
      required: false,
      description: 'Additional notes about the item',
    },
  ],
  templateData: 'productSku,size,condition,quantity,cost,notes\n123456,10,NEW,5,150.00,New arrival\n789012,M,GOOD,3,120.00,Minor wear\n345678,L,LIKE_NEW,2,140.00,Excellent condition',
  importFunction: async (file: File) => {
    const { importInventory } = useImportInventory();
    const result = await importInventory(file);
    if (!result) {
      throw new Error('Failed to import inventory');
    }
    return result;
  },
});
