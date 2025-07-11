'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import PageContainer from '@/components/PageContainer';
import { Card } from '@/components/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import { useAuth } from '@/contexts/AuthContext';

interface PurchaseOrder {
  id: string;
  r3vPurchaseOrderNumber: string;
  inventoryItemId: string;
  vendor: string;
  paymentMethod: string;
  orderNumber?: string;
  quantity: number;
  cost: number;
  purchaseDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  inventoryItem: {
    id: string;
    sku: string;
    size: string;
    condition: string;
    product: {
      id: string;
      brand: string;
      name: string;
      color: string;
    };
  };
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const { getAuthToken } = useAuth();

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      const res = await fetch('/api/purchase-orders', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch purchase orders');
      }

      const data = await res.json();
      setPurchaseOrders(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (purchaseOrder: PurchaseOrder) => {
    // You can add logic here to determine status based on your business rules
    return <Badge variant="default">Active</Badge>;
  };

  // Filter purchase orders based on search term and vendor filter
  const filteredPurchaseOrders = purchaseOrders.filter((po) => {
    const matchesSearch = 
      po.inventoryItem?.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.inventoryItem?.product?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.inventoryItem?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.r3vPurchaseOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesVendor = vendorFilter === '' || po.vendor === vendorFilter;
    
    return matchesSearch && matchesVendor;
  });

  // Get unique vendors for filter dropdown
  const uniqueVendors = [...new Set(purchaseOrders.map(po => po.vendor))];

  const columns = [
    {
      key: 'r3vPurchaseOrderNumber',
      label: 'PO Number',
      render: (purchaseOrder: PurchaseOrder) => (
        <span className="font-mono text-sm font-medium">
          {purchaseOrder.r3vPurchaseOrderNumber}
        </span>
      ),
    },
    {
      key: 'product',
      label: 'Product',
      render: (purchaseOrder: PurchaseOrder) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {purchaseOrder.inventoryItem.product.brand} - {purchaseOrder.inventoryItem.product.name}
          </span>
          <span className="text-sm text-muted-foreground">
            {purchaseOrder.inventoryItem.product.color} | Size: {purchaseOrder.inventoryItem.size}
          </span>
        </div>
      ),
    },
    {
      key: 'vendor',
      label: 'Vendor',
      render: (purchaseOrder: PurchaseOrder) => (
        <span className="font-medium">{purchaseOrder.vendor}</span>
      ),
    },
    {
      key: 'quantity',
      label: 'Qty',
      render: (purchaseOrder: PurchaseOrder) => (
        <span className="font-medium">{purchaseOrder.quantity}</span>
      ),
    },
    {
      key: 'cost',
      label: 'Cost',
      render: (purchaseOrder: PurchaseOrder) => (
        <span className="font-medium">{formatCurrency(purchaseOrder.cost)}</span>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      render: (purchaseOrder: PurchaseOrder) => (
        <span className="font-bold text-primary">
          {formatCurrency(purchaseOrder.cost * purchaseOrder.quantity)}
        </span>
      ),
    },
    {
      key: 'purchaseDate',
      label: 'Date',
      render: (purchaseOrder: PurchaseOrder) => (
        <span className="text-sm">{formatDate(purchaseOrder.purchaseDate)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (purchaseOrder: PurchaseOrder) => getStatusBadge(purchaseOrder),
    },
  ];

  if (loading) {
    return (
      <Layout>
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading purchase orders...</p>
            </div>
          </div>
        </PageContainer>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageContainer>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Purchase Orders</h1>
              <p className="text-muted-foreground mt-1">
                Manage and track all purchase orders
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold text-foreground">{filteredPurchaseOrders.length}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 text-lg">📋</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(
                        filteredPurchaseOrders.reduce((sum, po) => sum + (po.cost * po.quantity), 0)
                      )}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 text-lg">💰</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold text-foreground">
                      {filteredPurchaseOrders.filter(po => {
                        const poDate = new Date(po.purchaseDate);
                        const now = new Date();
                        return poDate.getMonth() === now.getMonth() && 
                               poDate.getFullYear() === now.getFullYear();
                      }).length}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 text-lg">📅</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Vendors</p>
                    <p className="text-2xl font-bold text-foreground">
                      {new Set(filteredPurchaseOrders.map(po => po.vendor)).size}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 text-lg">🏢</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card>
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by product name, brand, SKU, vendor, or order number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <select 
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Vendors</option>
                  {uniqueVendors.map(vendor => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Purchase Orders Table */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Purchase Orders</h2>
              </div>

              {error ? (
                <div className="text-center py-8">
                  <p className="text-red-500 mb-4">{error}</p>
                  <Button onClick={fetchPurchaseOrders} variant="outline">
                    Retry
                  </Button>
                </div>
              ) : filteredPurchaseOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📋</span>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No purchase orders yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first purchase order to get started
                  </p>
                  <Button onClick={() => {}}>
                    Create Purchase Order
                  </Button>
                </div>
                             ) : (
                 <Table className="w-full">
                   <TableHeader>
                     <TableRow>
                       {columns.map((column) => (
                         <TableHead key={column.key} className="text-left font-medium">
                           {column.label}
                         </TableHead>
                       ))}
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {filteredPurchaseOrders.map((purchaseOrder) => (
                       <TableRow key={purchaseOrder.id} className="hover:bg-muted/50">
                         {columns.map((column) => (
                           <TableCell key={column.key}>
                             {column.render(purchaseOrder)}
                           </TableCell>
                         ))}
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               )}
            </div>
          </Card>
        </div>
      </PageContainer>
    </Layout>
  );
} 
