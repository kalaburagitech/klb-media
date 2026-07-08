import { basename, join } from "node:path";
import type { AppConfig } from "../config.js";
import { buildPublicUrl } from "../config.js";
import { buildWorkDir, cleanupWorkDir, downloadFromR2 } from "../r2.js";
import { processAudio } from "./audio.js";
import { processImage } from "./image.js";
import { probeMedia } from "./shared.js";
import { processVideo } from "./video.js";

export type ProcessJobInput = {
  mediaId: string;
  userId: string;
  r2Key: string;
  fileName: string;
  contentType: string;
  mediaType: "image" | "video" | "audio" | "document" | "other";
  callbackUrl?: string;
};

export type ProcessJobResult = {
  mediaId: string;
  status: "ready" | "failed";
  publicUrl?: string;
  variants?: Array<{
    label: string;
    r2Key: string;
    contentType: string;
    format: string;
    width?: number;
    height?: number;
    bitrate?: number;
    size?: number;
  }>;
  hls?: { masterKey: string; segmentPrefix: string };
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    codec?: string;
    fps?: number;
  };
  error?: string;
};

export async function processMediaJob(
  config: AppConfig,
  job: ProcessJobInput
): Promise<ProcessJobResult> {
  const workDir = buildWorkDir(config, job.mediaId);
  const inputPath = join(workDir, basename(job.r2Key));

  try {
    await downloadFromR2(config, job.r2Key, inputPath);
    const probe = await probeMedia(inputPath, config);

    if (job.mediaType === "image" || job.contentType.startsWith("image/")) {
      const result = await processImage(
        config,
        inputPath,
        job.userId,
        job.mediaId,
        job.r2Key,
        job.contentType,
        probe
      );

      return {
        mediaId: job.mediaId,
        status: "ready",
        publicUrl: buildPublicUrl(config, job.r2Key),
        variants: result.variants,
        metadata: result.metadata,
      };
    }

    if (job.mediaType === "audio" || job.contentType.startsWith("audio/")) {
      const result = await processAudio(
        config,
        inputPath,
        job.userId,
        job.mediaId,
        job.r2Key,
        job.contentType,
        probe
      );

      return {
        mediaId: job.mediaId,
        status: "ready",
        publicUrl: buildPublicUrl(config, job.r2Key),
        variants: result.variants,
        metadata: result.metadata,
      };
    }

    if (job.mediaType === "video" || job.contentType.startsWith("video/")) {
      const result = await processVideo(
        config,
        inputPath,
        job.userId,
        job.mediaId,
        job.r2Key,
        job.contentType,
        probe
      );

      return {
        mediaId: job.mediaId,
        status: "ready",
        publicUrl: buildPublicUrl(config, job.r2Key),
        variants: result.variants,
        hls: result.hls,
        metadata: result.metadata,
      };
    }

    return {
      mediaId: job.mediaId,
      status: "ready",
      publicUrl: buildPublicUrl(config, job.r2Key),
      variants: [
        {
          label: "original",
          r2Key: job.r2Key,
          contentType: job.contentType,
          format: job.fileName.split(".").pop() ?? "bin",
        },
      ],
      metadata: probe,
    };
  } catch (error) {
    return {
      mediaId: job.mediaId,
      status: "failed",
      error: error instanceof Error ? error.message : "Processing failed",
    };
  } finally {
    await cleanupWorkDir(workDir);
  }
}

export async function notifyCallback(
  callbackUrl: string | undefined,
  secret: string | undefined,
  payload: ProcessJobResult
): Promise<void> {
  if (!callbackUrl) return;

  await fetch(callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}
