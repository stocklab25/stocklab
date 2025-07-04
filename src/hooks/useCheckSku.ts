import { useState } from 'react';

const useCheckSku = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkSkuExists = async (sku: string): Promise<boolean> => {
    if (!sku.trim()) return false;
    
    setIsChecking(true);
    try {
      const response = await fetch(`/api/products/check-sku?sku=${encodeURIComponent(sku)}`);
      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error('Error checking SKU:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    checkSkuExists,
    isChecking,
  };
};

export default useCheckSku; 