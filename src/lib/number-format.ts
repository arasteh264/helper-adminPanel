const persianNumberFormatter = new Intl.NumberFormat("fa-IR");
const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const groupingSeparator = persianNumberFormatter.formatToParts(1000).find(({ type }) => type === "group")?.value ?? "٬";
const decimalSeparator = persianNumberFormatter.formatToParts(1.1).find(({ type }) => type === "decimal")?.value ?? "٫";

function toPersianDigits(value: string): string {
  return value.replace(/\d/g, (digit) => persianDigits[Number(digit)]);
}

export function normalizeIntegerInput(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "");
}

export function formatGroupedInteger(value: string): string {
  const digits = normalizeIntegerInput(value);
  if (!digits) return "";
  return toPersianDigits(digits.replace(/\B(?=(\d{3})+(?!\d))/g, groupingSeparator));
}

export function normalizeDecimalInput(value: string): string {
  const asciiDigits = value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[٫,٬\s]/g, (separator) => (separator === "٫" ? "." : ""));
  const decimalIndex = asciiDigits.indexOf(".");
  if (decimalIndex < 0) return asciiDigits.replace(/\D/g, "");

  const integer = asciiDigits.slice(0, decimalIndex).replace(/\D/g, "");
  const fraction = asciiDigits.slice(decimalIndex + 1).replace(/\D/g, "");
  return `${integer}.${fraction}`;
}

export function formatGroupedDecimalInput(value: string): string {
  const normalized = normalizeDecimalInput(value);
  if (!normalized) return "";

  const decimalIndex = normalized.indexOf(".");
  const integer = decimalIndex < 0 ? normalized : normalized.slice(0, decimalIndex);
  const fraction = decimalIndex < 0 ? "" : normalized.slice(decimalIndex + 1);
  const formattedInteger = formatGroupedInteger(integer);
  return decimalIndex < 0 ? formattedInteger : `${formattedInteger}${decimalSeparator}${toPersianDigits(fraction)}`;
}
