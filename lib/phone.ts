/**
 * Normalises a raw Ukrainian phone string to +380XXXXXXXXX format.
 * Handles: 099xxxxxxx → +38099…, +38099… stays, 38099… → +38099…
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("380")) return "+" + digits;
  if (digits.startsWith("0") && digits.length === 10) return "+38" + digits;
  return "+" + digits;
}
