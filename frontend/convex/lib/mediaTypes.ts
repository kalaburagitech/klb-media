import { v } from "convex/values";

export const MEDIA_TYPES = [
  "image",
  "video",
  "audio",
  "document",
  "other",
] as const;

export const PROCESSING_STATUSES = [
  "pending",
  "uploading",
  "processing",
  "ready",
  "failed",
] as const;

export const VIDEO_PROFILES = [
  { label: "360p", height: 360, width: 640, videoBitrate: "800k", audioBitrate: "96k" },
  { label: "480p", height: 480, width: 854, videoBitrate: "1400k", audioBitrate: "128k" },
  { label: "720p", height: 720, width: 1280, videoBitrate: "2800k", audioBitrate: "128k" },
  { label: "1080p", height: 1080, width: 1920, videoBitrate: "5000k", audioBitrate: "192k" },
  { label: "4k", height: 2160, width: 3840, videoBitrate: "14000k", audioBitrate: "192k" },
] as const;

export const AUDIO_PROFILES = [
  { label: "mp3_128", format: "mp3", bitrate: "128k" },
  { label: "mp3_256", format: "mp3", bitrate: "256k" },
  { label: "aac_128", format: "aac", bitrate: "128k" },
  { label: "ogg_128", format: "ogg", bitrate: "128k" },
] as const;

export const IMAGE_PROFILES = [
  { label: "thumb", maxWidth: 150, maxHeight: 150 },
  { label: "sm", maxWidth: 480 },
  { label: "md", maxWidth: 768 },
  { label: "lg", maxWidth: 1280 },
  { label: "xl", maxWidth: 1920 },
] as const;

export const variantValidator = v.object({
  label: v.string(),
  r2Key: v.string(),
  contentType: v.string(),
  format: v.string(),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  bitrate: v.optional(v.number()),
  size: v.optional(v.number()),
  url: v.optional(v.string()),
});

export const hlsValidator = v.object({
  masterKey: v.string(),
  masterUrl: v.optional(v.string()),
  segmentPrefix: v.string(),
});

export const metadataValidator = v.object({
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  duration: v.optional(v.number()),
  codec: v.optional(v.string()),
  fps: v.optional(v.number()),
});

export function detectMediaType(contentType: string): (typeof MEDIA_TYPES)[number] {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (
    contentType === "application/pdf" ||
    contentType.startsWith("text/") ||
    contentType.includes("document")
  ) {
    return "document";
  }
  return "other";
}

export function buildOriginalKey(userId: string, mediaId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `originals/${userId}/${mediaId}/${safeName}`;
}

export function buildVariantKey(
  userId: string,
  mediaId: string,
  label: string,
  extension: string
): string {
  return `variants/${userId}/${mediaId}/${label}.${extension}`;
}

export function buildHlsPrefix(userId: string, mediaId: string): string {
  return `hls/${userId}/${mediaId}`;
}
