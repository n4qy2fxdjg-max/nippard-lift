/**
 * Convert Arabic-Indic (٠١٢٣٤٥٦٧٨٩) and Extended Arabic-Indic (۰۱۲۳۴۵۶۷۸۹)
 * numerals to Western Arabic (0123456789).
 * Safe to call on any string — non-numeral characters pass through unchanged.
 */
export function toWestern(s: string): string {
  return s
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)) // Arabic-Indic
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06F0)) // Extended Arabic-Indic
}
