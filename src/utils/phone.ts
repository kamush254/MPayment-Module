export function normalizePhone(input: string): string {
  // Remove spaces, dashes and the leading +
  const digits = input.replace(/[\s\-+]/g, "");

  let normalized: string;
  if (/^0[71]\d{8}$/.test(digits)) {
    normalized = "254" + digits.slice(1); // 0712345678 -> 254712345678
  } else if (/^[71]\d{8}$/.test(digits)) {
    normalized = "254" + digits; // 712345678 -> 254712345678
  } else if (/^254[71]\d{8}$/.test(digits)) {
    normalized = digits; // already correct
  } else {
    throw new Error(`Invalid Kenyan phone number: ${input}`);
  }

  return normalized;
}