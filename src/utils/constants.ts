export const TRANSACTION_TYPE = {
  OUT: 'Stock Out',
  RETURN: 'Return',
  TRANSFER_TO_STORE: 'Transfer to Store',
  TRANSFER_FROM_STORE: 'Transfer from Store',
  SALE_AT_STORE: 'Sale at Store',
} as const;

export type TransactionTypeKey = keyof typeof TRANSACTION_TYPE; 
