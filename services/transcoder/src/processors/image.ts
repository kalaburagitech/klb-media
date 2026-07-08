import { dirname, join } from "node:path";
import sharp from "sharp";
import type { AppConfig } from "../config.js";
import { buildPublicUrl } from "../config.js";
import {
  buildVariantKey,
  IMAGE_PROFILES,
  type ProbeResult,
} from "./shared.js";
import { uploadBufferToR2, uploadToR2 } from "../r2.js";

export type ImageVariant = {
  label: string;
  r2Key: string;
  contentType: string;
  format: string;
  width?: number;
  height?: number;
  size?: number;
  url: string;
};

export async function processImage(
  config: AppConfig,
  inputPath: string,
  userId: string,
  mediaId: string,
  originalKey: string,
  contentType: string,
  probe: ProbeResult
): Promise<{ variants: ImageVariant[]; metadata: ProbeResult }> {
  const variants: ImageVariant[] = [];
  const ext = originalKey.split(".").pop() ?? "jpg";

  variants.push({
    label: "original",
    r2Key: originalKey,
    contentType,
    format: ext,
    width: probe.width,
    height: probe.height,
    url: buildPublicUrl(config, originalKey),
  });

  for (const profile of IMAGE_PROFILES) {
    const outputPath = join(dirname(inputPath), `${profile.label}.webp`);
    const pipeline = sharp(inputPath).rotate();

    if ("maxHeight" in profile && profile.maxHeight) {
      pipeline.resize(profile.maxWidth, profile.maxHeight, {
        fit: "cover",
        withoutEnlargement: true,
      });
    } else {
      pipeline.resize({ width: profile.maxWidth, withoutEnlargement: true });
    }

    const buffer = await pipeline.webp({ quality: 82 }).toBuffer();
    const metadata = await sharp(buffer).metadata();
    const r2Key = buildVariantKey(userId, mediaId, profile.label, "webp");
    const size = await uploadBufferToR2(config, r2Key, buffer, "image/webp");

    variants.push({
      label: profile.label,
      r2Key,
      contentType: "image/webp",
      format: "webp",
      width: metadata.width,
      height: metadata.height,
      size,
      url: buildPublicUrl(config, r2Key),
    });
  }

  // JPEG fallback for lg profile (broader compatibility)
  const lgJpegPath = join(dirname(inputPath), "lg.jpg");
  await sharp(inputPath)
    .rotate()
    .resize({ width: 1280, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(lgJpegPath);

  const lgJpegKey = buildVariantKey(userId, mediaId, "lg_jpeg", "jpg");
  const lgSize = await uploadToR2(config, lgJpegKey, lgJpegPath, "image/jpeg");
  variants.push({
    label: "lg_jpeg",
    r2Key: lgJpegKey,
    contentType: "image/jpeg",
    format: "jpg",
    size: lgSize,
    url: buildPublicUrl(config, lgJpegKey),
  });

  return { variants, metadata: probe };
}
