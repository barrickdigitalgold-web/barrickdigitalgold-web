export const formatCurrency = (amount: number): string => {
  return amount.toFixed(2);
};

export const getCurrencySymbol = (country: string): string => {
  // Return empty string to remove currency symbols
  return '';
};
