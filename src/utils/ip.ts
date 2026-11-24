// Express may report IPv4 addresses as "::ffff:1.2.3.4"
export function normalizeIp(ip: string | undefined): string {
  return (ip ?? "").replace(/^::ffff:/, "");
}

export function isAllowedIp(ip: string | undefined, allowed: string[]): boolean {
  return allowed.includes(normalizeIp(ip));
}