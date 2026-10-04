/**
 * Standardized currency formatting utility for PerformanceOS & SWEAT.
 * Consistently renders Indian Rupee (₹) format across all workspaces and tables.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options?: {
    showDecimals?: boolean;
    defaultValue?: string;
  }
): string {
  if (amount === null || amount === undefined || amount === "") {
    return options?.defaultValue ?? "₹0";
  }

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return options?.defaultValue ?? "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: options?.showDecimals ? 2 : 0,
    minimumFractionDigits: options?.showDecimals ? 2 : 0,
  }).format(num);
}

/**
 * Standardized percentage formatting utility for PerformanceOS & SWEAT.
 * Consistently strips decimals and renders whole integer percentages (e.g. "20%" or "20") everywhere.
 */
export function formatPercentage(
  val: number | string | null | undefined,
  options?: {
    withSymbol?: boolean;
    defaultValue?: string;
  }
): string {
  if (val === null || val === undefined || val === '') {
    return options?.defaultValue ?? (options?.withSymbol ? '0%' : '0');
  }

  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) {
    return options?.defaultValue ?? (options?.withSymbol ? '0%' : '0');
  }

  const rounded = Math.round(num);
  return options?.withSymbol ? `${rounded}%` : String(rounded);
}
