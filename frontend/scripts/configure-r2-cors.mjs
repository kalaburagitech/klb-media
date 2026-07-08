/**
 * Configure CORS on the klbmedia R2 bucket for direct browser uploads.
 * Run: node scripts/configure-r2-cors.mjs
 */
import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

const env = loadEnv();
const accountId = env.R2_ACCOUNT_ID;
const bucket = env.R2_BUCKET || "klbmedia";

const client = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const origins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "http://192.168.0.107:3000",
  "http://192.168.0.107:3001",
  "http://192.168.0.107:3002",
];

await client.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
          AllowedOrigins: origins,
          ExposeHeaders: ["ETag", "Content-Length"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  })
);

console.log(`✔ CORS configured on bucket "${bucket}" for origins:`);
for (const origin of origins) console.log(`  - ${origin}`);
