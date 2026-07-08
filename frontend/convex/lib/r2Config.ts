export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  publicBaseUrl: string;
};

export function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET ?? "klbmedia";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in Convex environment."
    );
  }

  const endpoint =
    process.env.R2_ENDPOINT ??
    `https://${accountId}.r2.cloudflarestorage.com`;

  const publicBaseUrl =
    process.env.R2_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_MEDIA_CDN_URL ??
    `https://${bucket}.${accountId}.r2.cloudflarestorage.com`;

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint,
    publicBaseUrl,
  };
}

export function buildPublicUrl(baseUrl: string, key: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${normalizedBase}/${encodedKey}`;
}

/** App proxy path — R2 S3 endpoint is not publicly readable in the browser. */
export function buildAppDeliveryUrl(key: string): string {
  return `/api/r2-file?key=${encodeURIComponent(key)}`;
}

export function isPrivateR2EndpointUrl(url: string): boolean {
  return url.includes(".r2.cloudflarestorage.com");
}
