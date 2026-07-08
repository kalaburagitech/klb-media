/** Browser-safe delivery URL via Next.js proxy (R2 bucket is private). */
export function buildMediaDeliveryUrl(r2Key: string): string {
  return `/api/r2-file?key=${encodeURIComponent(r2Key)}`;
}
