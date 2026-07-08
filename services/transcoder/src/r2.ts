import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import type { AppConfig } from "./config.js";
import { getR2Endpoint } from "./config.js";

let client: S3Client | null = null;

export function getS3Client(config: AppConfig): S3Client {
  if (client) return client;
  client = new S3Client({
    region: "auto",
    endpoint: getR2Endpoint(config),
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
  return client;
}

export async function downloadFromR2(
  config: AppConfig,
  key: string,
  destinationPath: string
): Promise<void> {
  await mkdir(dirname(destinationPath), { recursive: true });
  const s3 = getS3Client(config);
  const response = await s3.send(
    new GetObjectCommand({ Bucket: config.R2_BUCKET, Key: key })
  );

  if (!response.Body) throw new Error(`Empty object body for ${key}`);
  await pipeline(response.Body as NodeJS.ReadableStream, createWriteStream(destinationPath));
}

export async function uploadToR2(
  config: AppConfig,
  key: string,
  filePath: string,
  contentType: string
): Promise<number> {
  const s3 = getS3Client(config);
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: config.R2_BUCKET,
      Key: key,
      Body: createReadStream(filePath),
      ContentType: contentType,
    },
  });

  const result = await upload.done();
  const stat = await import("node:fs/promises").then((fs) => fs.stat(filePath));
  return stat.size;
}

export async function uploadBufferToR2(
  config: AppConfig,
  key: string,
  body: Buffer,
  contentType: string
): Promise<number> {
  const s3 = getS3Client(config);
  await s3.send(
    new PutObjectCommand({
      Bucket: config.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return body.length;
}

export async function uploadTextToR2(
  config: AppConfig,
  key: string,
  content: string,
  contentType: string
): Promise<number> {
  return uploadBufferToR2(config, key, Buffer.from(content, "utf-8"), contentType);
}

export async function cleanupWorkDir(workDir: string): Promise<void> {
  await rm(workDir, { recursive: true, force: true });
}

export function buildWorkDir(config: AppConfig, mediaId: string): string {
  return join(config.TEMP_DIR, mediaId, String(Date.now()));
}
