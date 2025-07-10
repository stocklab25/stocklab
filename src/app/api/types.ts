// Product: describes the product type/model
export interface Product {
  id: string;
  brand: string;
  name: string;
  color?: string;
  sku?: string;
  itemType: 'SHOE' | 'APPAREL';
  cost?: number;
}

// InventoryItem: each physical item in your warehouse
export interface InventoryItem {
  id: string;
  productId: string; // references Product.id
  sku: string;
  size: string;
  condition: string;
  cost: number;
  status: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    brand: string;
    name: string;
    color: string;
    sku: string;
  };
}

// StockTransaction: every movement/change for traceability
export interface StockTransaction {
  id: string;
  itemId: string; // references InventoryItem.id
  type: 'in' | 'out' | 'move' | 'return' | 'adjustment' | 'audit';
  quantity: number;
  date: string;
  fromLocation?: string;
  toLocation?: string;
  user?: string;
  notes?: string;
} 