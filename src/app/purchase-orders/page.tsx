'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import Button from '@/components/Button';
import { AddIcon, EditIcon, DeleteIcon, MoreIcon, ChevronDownIcon, ChevronRightIcon } from '@/utils/icons';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import AddPurchaseOrderModal from '@/components/AddPurchaseOrderModal';
import DeliverPurchaseOrderModal from '@/components/DeliverPurchaseOrderModal';
import { useProducts } from '@/hooks';

interface PurchaseOrder {
  id: string;
  vendorName: string;
  r3vPurchaseOrderNumber: string;
  orderNumber?: string;
  orderDate: string;
  deliveryDate?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  notes?: string;
  createdAt: string;
  purchaseOrderItems: PurchaseOrderItem[];
}

interface PurchaseOrderItem {
  id: string;
  productId: string;
  size: string;
  condition: string;
  quantityOrdered: number;
  unitCost: number;
  totalCost: number;
  product: {
    id: string;
    brand: string;
    name: string;
    sku?: string;
  };
}

export default function PurchaseOrders() {
  const { getAuthToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { data: purchaseOrders, isLoading, isError, mutate } = usePurchaseOrders(statusFilter || undefined);
  const { data: products } = useProducts();



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-accent text-accent-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleDeliverOrder = (order: PurchaseOrder) => {
    setSelectedPurchaseOrder(order);
    setShowDeliverModal(true);
    setOpenDropdown(null);
  };

  const toggleDropdown = (orderId: string) => {
    setOpenDropdown(openDropdown === orderId ? null : orderId);
  };

  const toggleExpandedRow = (orderId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(orderId)) {
      newExpandedRows.delete(orderId);
    } else {
      newExpandedRows.add(orderId);
    }
    setExpandedRows(newExpandedRows);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading purchase orders...</div>
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error loading purchase orders</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Purchase Orders</h1>
            <p className="text-muted-foreground mt-2">Manage your purchase orders from vendors</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <AddIcon /> New Purchase Order
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by vendor name or order number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Purchase Orders Table */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Purchase Orders ({purchaseOrders.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-foreground w-8"></th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Vendor</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">R3V P.O. #</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Order #</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Order Date</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Items</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Total Qty</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Total Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8">
                        <p className="text-muted-foreground">No purchase orders found</p>
                      </td>
                    </tr>
                  ) : (
                    purchaseOrders.map((order: PurchaseOrder) => {
                      const totalQuantity = order.purchaseOrderItems.reduce((sum, item) => sum + item.quantityOrdered, 0);
                      const uniqueItems = order.purchaseOrderItems.length;
                      const isExpanded = expandedRows.has(order.id);

                      return (
                        <React.Fragment key={order.id}>
                          <tr className="border-b border-muted hover:bg-accent">
                            <td className="py-3 px-4">
                              <button
                                onClick={() => toggleExpandedRow(order.id)}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-foreground">{order.vendorName}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-sm text-blue-600">{order.r3vPurchaseOrderNumber}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-sm">{order.orderNumber || 'N/A'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-foreground">{formatDate(order.orderDate)}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-foreground">{uniqueItems} item{uniqueItems !== 1 ? 's' : ''}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium text-foreground">{totalQuantity}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium text-foreground">{formatCurrency(order.totalAmount)}</span>
                            </td>
                            <td className="py-3 px-4 text-right relative">
                              <button 
                                onClick={() => toggleDropdown(order.id)}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                              >
                                <MoreIcon />
                              </button>
                              
                              {openDropdown === order.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                  <div className="py-1">
                                    {order.status !== 'DELIVERED' && (
                                      <button
                                        onClick={() => handleDeliverOrder(order)}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                        Mark as Delivered
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        // TODO: Add edit functionality
                                        setOpenDropdown(null);
                                      }}
                                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      Edit Order
                                    </button>
                                    <button
                                      onClick={() => {
                                        // TODO: Add delete functionality
                                        setOpenDropdown(null);
                                      }}
                                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                    >
                                      Delete Order
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        
                        {/* Expanded Row Content */}
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={10} className="px-4 py-4">
                              <div className="space-y-4">
                                <h4 className="font-medium text-foreground">Purchase Order Items</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-gray-200">
                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Product</th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Size</th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Condition</th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Quantity</th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Unit Cost</th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Total Cost</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {order.purchaseOrderItems.map((item) => (
                                        <tr key={item.id} className="border-b border-gray-100">
                                          <td className="py-2 px-3">
                                            <div>
                                              <p className="font-medium text-foreground">
                                                {item.product.brand} {item.product.name}
                                              </p>
                                              {item.product.sku && (
                                                <p className="text-xs text-muted-foreground font-mono">
                                                  SKU: {item.product.sku}
                                                </p>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-2 px-3 text-foreground">{item.size}</td>
                                          <td className="py-2 px-3 text-foreground">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                              item.condition === 'NEW' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                              {item.condition === 'NEW' ? 'New' : 'Pre-owned'}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-foreground">{item.quantityOrdered}</td>
                                          <td className="py-2 px-3 text-foreground">{formatCurrency(item.unitCost)}</td>
                                          <td className="py-2 px-3 text-foreground font-medium">{formatCurrency(item.totalCost)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                {order.notes && (
                                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                      <span className="font-medium">Notes:</span> {order.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Add Purchase Order Modal */}
        <AddPurchaseOrderModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            mutate();
            setShowAddModal(false);
          }}
          products={products || []}
        />

        {/* Deliver Purchase Order Modal */}
        <DeliverPurchaseOrderModal
          isOpen={showDeliverModal}
          onClose={() => setShowDeliverModal(false)}
          onSuccess={() => {
            mutate();
            setShowDeliverModal(false);
            setSelectedPurchaseOrder(null);
          }}
          purchaseOrder={selectedPurchaseOrder}
        />
      </div>
    </Layout>
  );
} 
