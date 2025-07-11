"use client";

import React, { useState, useCallback, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/Table";
import Button from '@/components/Button';
import useSWR from "swr";
import AddSaleModal from '@/components/AddSaleModal';
import ImportSalesModal from '@/components/ImportSalesModal';
import { useStores } from '@/hooks/useStores';
import { useStoreInventory } from '@/hooks/useStoreInventory';
import { useAddSale } from '@/hooks/useAddSale';
import { useSales } from '@/hooks/useSales';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';

export default function StoreSalesPage() {
  const { getAuthToken } = useAuth();
  const { data: sales, isLoading, mutate } = useSales();
  const { data: stores, isLoading: storesLoading } = useStores();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const { addSale, isLoading: isAdding } = useAddSale(
    () => {
      setIsModalOpen(false);
      mutate();
    },
    (err) => setModalError(err)
  );
  const { formatCurrency } = useCurrency();

  // Fetch inventory for selected store (for modal)
  const fetchInventory = useCallback(async (storeId: string) => {
    const token = await getAuthToken();
    const res = await fetch(`/api/stores/${storeId}/inventory`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error('Failed to fetch inventory');
    const data = await res.json();
    // Flatten to inventoryItem[]
    return (Array.isArray(data) ? data : []).map((si: any) => ({ ...si.inventoryItem, quantity: si.quantity }));
  }, [getAuthToken]);

  // Filter sales based on selected store
  const filteredSales = storeFilter === 'all' 
    ? sales 
    : sales.filter((sale: any) => sale.store?.id === storeFilter);

  const columns = [
    { key: "orderNumber", label: "Order #" },
    { key: "store", label: "Store" },
    { key: "brand", label: "Brand" },
    { key: "productName", label: "Product" },
    { key: "color", label: "Color" },
    { key: "size", label: "Size" },
    { key: "condition", label: "Condition" },
    { key: "sku", label: "SKU" },
    { key: "quantity", label: "Qty" },
    { key: "cost", label: "Cost" },
    { key: "payout", label: "Payout" },
    { key: "discount", label: "Discount" },
    { key: "profit", label: "Profit" },
    { key: "profitMargin", label: "Profit Margin" },
    { key: "saleDate", label: "Sale Date" },
    { key: "notes", label: "Notes" },
  ];

  const rows = filteredSales.map((sale: any) => {
    const product = sale.inventoryItem?.product || {};
    const cost = Number(sale.cost) || 0;
    const payout = Number(sale.payout) || 0;
    const discount = Number(sale.discount) || 0;
    const profit = payout - cost - discount;
    const profitMargin = cost > 0 ? ((profit / cost) * 100).toFixed(2) + "%" : "-";

    return {
      id: sale.id,
      orderNumber: sale.orderNumber,
      store: sale.store?.name || "-",
      brand: product.brand || "-",
      productName: product.name || "-",
      color: product.color || "-",
      size: sale.inventoryItem?.size || "-",
      condition: sale.inventoryItem?.condition || "-",
      sku: sale.inventoryItem?.sku || "-",
      quantity: sale.quantity,
      cost: formatCurrency(cost),
      payout: formatCurrency(payout),
      discount: discount > 0 ? formatCurrency(discount) : "-",
      profit: formatCurrency(profit),
      profitMargin,
      saleDate: new Date(sale.saleDate).toLocaleDateString(),
      notes: sale.notes || "-",
    };
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Store Sales</h1>
            <p className="text-muted-foreground mt-2">All sales per store</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => setIsImportModalOpen(true)}>
              <span className="mr-2">📁</span>
              Import Sales
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <span className="mr-2">+</span>
              Add Sale
            </Button>
          </div>
        </div>

        {/* Store Filter */}
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-1/4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Filter by Store
                </label>
                <select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Stores</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1"></div>
              <div className="text-sm text-muted-foreground">
                Showing {rows.length} of {sales.length} sales
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6 overflow-x-auto">
            {isLoading ? (
              <div>Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="w-full min-w-max">
                  <TableHeader>
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead key={col.key}>{col.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length > 0 ? (
                      rows.map((row: any) => (
                        <TableRow key={row.id}>
                          {columns.map((col) => (
                            <TableCell key={col.key}>{row[col.key]}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center py-8">
                          {storeFilter === 'all' ? 'No sales found' : 'No sales found for selected store'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>
      </div>
      <AddSaleModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setModalError(null); }}
        onSubmit={addSale}
        stores={stores || []}
        fetchInventory={fetchInventory}
        isLoading={isAdding}
      />
      <ImportSalesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          mutate();
        }}
      />
    </Layout>
  );
} 
