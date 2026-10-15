export function toAsciiDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x6f0 ? code - 0x6f0 : code - 0x660);
  });
}

export function normalizeIranianMobile(value: string): string | null {
  const phone = toAsciiDigits(value)
    .trim()
    .replace(/[\s()-]/g, "");
  let nationalPhone = phone;

  if (phone.startsWith("+98")) {
    nationalPhone = `0${phone.slice(3)}`;
  } else if (phone.startsWith("0098")) {
    nationalPhone = `0${phone.slice(4)}`;
  } else if (phone.startsWith("98") && phone.length === 12) {
    nationalPhone = `0${phone.slice(2)}`;
  } else if (/^9\d{9}$/.test(phone)) {
    nationalPhone = `0${phone}`;
  }

  return /^09\d{9}$/.test(nationalPhone) ? nationalPhone : null;
}
