import { useProducts, useInventory, useTransactions, useSales, useExpenses } from './index';

export function useDashboardData() {
  const { data: products, isLoading: productsLoading, isError: productsError } = useProducts();
  const { data: inventory, isLoading: inventoryLoading, isError: inventoryError } = useInventory();
  const { data: transactions, isLoading: transactionsLoading, isError: transactionsError } = useTransactions();
  const { data: salesData, isLoading: salesLoading, isError: salesError } = useSales();
  const { data: expensesData, isLoading: expensesLoading, isError: expensesError } = useExpenses();
  
  const isLoading = productsLoading || inventoryLoading || transactionsLoading || salesLoading || expensesLoading;
  const hasError = productsError || inventoryError || transactionsError || salesError || expensesError;
  
  return {
    products,
    inventory,
    transactions,
    salesData,
    expensesData,
    isLoading,
    hasError,
    // Individual loading states for granular control if needed
    loadingStates: {
      products: productsLoading,
      inventory: inventoryLoading,
      transactions: transactionsLoading,
      sales: salesLoading,
      expenses: expensesLoading,
    },
    // Individual error states for granular control if needed
    errorStates: {
      products: productsError,
      inventory: inventoryError,
      transactions: transactionsError,
      sales: salesError,
      expenses: expensesError,
    }
  };
}
