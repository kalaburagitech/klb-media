"use node";

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { buildAppDeliveryUrl, buildPublicUrl, getR2Config, isPrivateR2EndpointUrl } from "./r2Config";

let cachedClient: S3Client | null = null;

export function getR2Client(): S3Client {
  if (cachedClient) return cachedClient;

  const config = getR2Config();
  cachedClient = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return cachedClient;
}

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 3600
): Promise<{ uploadUrl: string; key: string; bucket: string; expiresAt: number }> {
  const config = getR2Config();
  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    uploadUrl,
    key,
    bucket: config.bucket,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
}

export async function createPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const config = getR2Config();
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export function getPublicUrlForKey(key: string): string {
  return buildAppDeliveryUrl(key);
}

export async function deleteR2Object(key: string): Promise<void> {
  const config = getR2Config();
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );
}

export async function deleteR2Prefix(prefix: string): Promise<void> {
  const config = getR2Config();
  const client = getR2Client();

  let continuationToken: string | undefined;
  do {
    const listing = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    const keys = (listing.Contents ?? [])
      .map((item) => item.Key)
      .filter((key): key is string => Boolean(key));

    if (keys.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: config.bucket,
          Delete: {
            Objects: keys.map((Key) => ({ Key })),
          },
        })
      );
    }

    continuationToken = listing.IsTruncated ? listing.NextContinuationToken : undefined;
  } while (continuationToken);
}

export async function headR2Object(key: string): Promise<{ size: number; contentType?: string }> {
  const config = getR2Config();
  const client = getR2Client();
  const result = await client.send(
    new HeadObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );

  return {
    size: result.ContentLength ?? 0,
    contentType: result.ContentType,
  };
}
