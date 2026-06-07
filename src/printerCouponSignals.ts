export function normalizePrinterCouponSignalText(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&(?:reg|trade|copy);|&#(?:174|8482|169);/gi, "")
    .replace(/[\u00ae\u2122\u2120\u00a9]/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function couponSignalTextIncludes(text: string, expectedSignal: string): boolean {
  const normalizedText = normalizePrinterCouponSignalText(text);
  const normalizedSignal = normalizePrinterCouponSignalText(expectedSignal);
  return normalizedSignal.length > 0 && normalizedText.includes(normalizedSignal);
}

export function matchPrinterCouponSignals(text: string, expectedSignals: string[]): string[] {
  return expectedSignals.filter((signal) => couponSignalTextIncludes(text, signal));
}
