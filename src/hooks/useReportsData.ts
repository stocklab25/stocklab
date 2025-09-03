import { useInventory, useProducts, useTransactions, useAllStoreInventory, useSales, useStores } from './index';

export function useReportsData() {
  const { data: inventory, isLoading: inventoryLoading, isError: inventoryError } = useInventory();
  const { data: products, isLoading: productsLoading, isError: productsError } = useProducts();
  const { data: transactions, isLoading: transactionsLoading, isError: transactionsError } = useTransactions();
  const { data: allStoreInventory, isLoading: storeInventoryLoading, isError: storeInventoryError } = useAllStoreInventory();
  const { data: salesData, isLoading: salesLoading, isError: salesError } = useSales();
  const { data: storesData, isLoading: storesLoading, isError: storesError } = useStores('ACTIVE');
  
  const isLoading = inventoryLoading || productsLoading || transactionsLoading || storeInventoryLoading || salesLoading || storesLoading;
  const hasError = inventoryError || productsError || transactionsError || storeInventoryError || salesError || storesError;
  
  return {
    inventory,
    products,
    transactions,
    allStoreInventory,
    salesData,
    storesData,
    isLoading,
    hasError,
    // Individual loading states for granular control if needed
    loadingStates: {
      inventory: inventoryLoading,
      products: productsLoading,
      transactions: transactionsLoading,
      storeInventory: storeInventoryLoading,
      sales: salesLoading,
      stores: storesLoading,
    },
    // Individual error states for granular control if needed
    errorStates: {
      inventory: inventoryError,
      products: productsError,
      transactions: transactionsError,
      storeInventory: storeInventoryError,
      sales: salesError,
      stores: storesError,
    }
  };
}
