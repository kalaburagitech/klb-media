import { AwsClient } from "aws4fetch";
import type { Env } from "./utils";

export async function createPresignedPutUrl(
  env: Env,
  key: string,
  contentType: string,
  expiresInSeconds = 3600
): Promise<string> {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const url = `${endpoint}/${env.R2_BUCKET}/${key}?X-Amz-Expires=${expiresInSeconds}`;

  const signed = await client.sign(
    new Request(url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
    }),
    { aws: { signQuery: true } }
  );

  return signed.url;
}

export async function proxyToConvex(
  env: Env,
  path: string,
  init?: RequestInit
): Promise<Response> {
  if (!env.CONVEX_SITE_URL) {
    return new Response(JSON.stringify({ error: "CONVEX_SITE_URL not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = `${env.CONVEX_SITE_URL.replace(/\/$/, "")}${path}`;
  return fetch(url, init);
}
