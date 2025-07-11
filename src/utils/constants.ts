export const TRANSACTION_TYPE = {
  IN: 'Stock In',
  OUT: 'Stock Out',
  MOVE: 'Move',
  RETURN: 'Return',
  ADJUSTMENT: 'Adjustment',
  AUDIT: 'Audit',
  TRANSFER_TO_STORE: 'Transfer to Store',
  TRANSFER_FROM_STORE: 'Transfer from Store',
  SALE_AT_STORE: 'Sale at Store',
} as const;

export type TransactionTypeKey = keyof typeof TRANSACTION_TYPE; 
