export interface Env {
  MEDIA_BUCKET: R2Bucket;
  R2_BUCKET: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_PUBLIC_BASE_URL?: string;
  CONVEX_SITE_URL?: string;
  TRANSCODER_URL?: string;
  TRANSCODER_SECRET?: string;
  API_SECRET?: string;
}

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-File-Name, X-Content-Type, X-Media-Id, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, ETag",
};

export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

export function unauthorized(): Response {
  return json({ error: "Unauthorized" }, 401);
}

export function verifyAuth(request: Request, env: Env): boolean {
  if (!env.API_SECRET) return true;
  const auth = request.headers.get("Authorization");
  return auth === `Bearer ${env.API_SECRET}`;
}

export function getPublicBaseUrl(env: Env): string {
  return (env.R2_PUBLIC_BASE_URL ?? `https://${env.R2_BUCKET}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`).replace(/\/$/, "");
}

export function buildPublicUrl(env: Env, key: string): string {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${getPublicBaseUrl(env)}/${encoded}`;
}

export function sanitizeKey(key: string): string | null {
  if (!key || key.includes("..") || key.startsWith("/")) return null;
  return key;
}

export function cacheHeaders(contentType: string, maxAge = 31536000): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Cache-Control": `public, max-age=${maxAge}, immutable`,
    "Accept-Ranges": "bytes",
    ...corsHeaders,
  };
}
