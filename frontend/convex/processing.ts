"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, type ActionCtx } from "./_generated/server";
import { buildHlsPrefix } from "./lib/mediaTypes";
import { isTranscodingEnabled, shouldTranscodeMediaType } from "./lib/processingConfig";
import { deleteR2Prefix, getPublicUrlForKey } from "./lib/r2Client";

type TranscoderCallback = {
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
  hls?: {
    masterKey: string;
    segmentPrefix: string;
  };
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    codec?: string;
    fps?: number;
  };
  error?: string;
};

type MediaRecord = {
  r2Key: string;
  fileName: string;
  contentType: string;
  mediaType: "image" | "video" | "audio" | "document" | "other";
  userId: string;
};

async function markOriginalReady(
  ctx: ActionCtx,
  mediaId: Id<"media">,
  media: MediaRecord
): Promise<void> {
  const publicUrl = getPublicUrlForKey(media.r2Key);
  const extension = media.fileName.split(".").pop() ?? "bin";

  await ctx.runMutation(internal.media.markReady, {
    mediaId,
    publicUrl,
    variants: [
      {
        label: "original",
        r2Key: media.r2Key,
        contentType: media.contentType,
        format: extension,
        url: publicUrl,
      },
    ],
  });
}

/** Mark upload ready with the original R2 file only — no FFmpeg, no extra storage. */
export const finalizeOriginalOnly = internalAction({
  args: { mediaId: v.id("media") },
  handler: async (ctx, args): Promise<void> => {
    const media = await ctx.runQuery(internal.media.getMediaForProcessing, {
      mediaId: args.mediaId,
    });

    if (!media) return;
    await markOriginalReady(ctx, args.mediaId, media);
  },
});

export const dispatchJob = internalAction({
  args: { mediaId: v.id("media") },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const media = await ctx.runQuery(internal.media.getMediaForProcessing, {
      mediaId: args.mediaId,
    });

    if (!media) {
      throw new Error("Media not found for processing");
    }

    if (!shouldTranscodeMediaType(media.mediaType)) {
      await markOriginalReady(ctx, args.mediaId, media);
      return { skipped: true, reason: "Original-only mode for this media type" };
    }

    const transcoderUrl = process.env.TRANSCODER_URL;
    const transcoderSecret = process.env.TRANSCODER_SECRET ?? "";

    if (!transcoderUrl || !isTranscodingEnabled()) {
      await markOriginalReady(ctx, args.mediaId, media);
      return { skipped: true, reason: "Transcoding disabled — stored as original" };
    }

    await ctx.runMutation(internal.media.incrementJobAttempt, {
      mediaId: args.mediaId,
    });

    try {
      const response: Response = await fetch(`${transcoderUrl.replace(/\/$/, "")}/v1/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(transcoderSecret ? { Authorization: `Bearer ${transcoderSecret}` } : {}),
        },
        body: JSON.stringify({
          mediaId: args.mediaId,
          userId: media.userId,
          r2Key: media.r2Key,
          fileName: media.fileName,
          contentType: media.contentType,
          mediaType: media.mediaType,
          callbackUrl: process.env.CONVEX_SITE_URL
            ? `${process.env.CONVEX_SITE_URL}/webhooks/transcoder`
            : undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Transcoder error (${response.status}): ${body}`);
      }

      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown transcoder error";
      await ctx.runMutation(internal.media.markFailed, {
        mediaId: args.mediaId,
        error: message,
      });
      throw error;
    }
  },
});

export const cleanupMediaAssets = internalAction({
  args: {
    mediaId: v.id("media"),
    userId: v.string(),
    r2Key: v.string(),
  },
  handler: async (_ctx, args) => {
    const variantPrefix = `variants/${args.userId}/${args.mediaId}/`;
    const hlsPrefix = buildHlsPrefix(args.userId, args.mediaId);

    await deleteR2Prefix(variantPrefix);
    await deleteR2Prefix(`${hlsPrefix}/`);
    await deleteR2Prefix(args.r2Key.substring(0, args.r2Key.lastIndexOf("/") + 1));
  },
});

export const handleTranscoderWebhook = internalAction({
  args: {
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const payload = args.payload as TranscoderCallback;

    if (!payload.mediaId) {
      throw new Error("Missing mediaId in webhook payload");
    }

    const mediaId = payload.mediaId as Id<"media">;

    if (payload.status === "failed") {
      await ctx.runMutation(internal.media.markFailed, {
        mediaId,
        error: payload.error ?? "Processing failed",
      });
      return { ok: false };
    }

    const variants = (payload.variants ?? []).map((variant) => ({
      ...variant,
      url: getPublicUrlForKey(variant.r2Key),
    }));

    const publicUrl =
      payload.publicUrl ??
      variants.find((item) => item.label === "original")?.url ??
      getPublicUrlForKey(variants[0]?.r2Key ?? "");

    const hls = payload.hls
      ? {
          masterKey: payload.hls.masterKey,
          segmentPrefix: payload.hls.segmentPrefix,
          masterUrl: getPublicUrlForKey(payload.hls.masterKey),
        }
      : undefined;

    await ctx.runMutation(internal.media.markReady, {
      mediaId,
      publicUrl,
      variants,
      hls,
      metadata: payload.metadata,
    });

    return { ok: true };
  },
});

export const retryFailedJobs = internalAction({
  args: {},
  handler: async (ctx): Promise<{ requeued: number; skipped?: boolean }> => {
    if (!isTranscodingEnabled()) {
      return { requeued: 0, skipped: true };
    }

    const failed = await ctx.runQuery(internal.media.getFailedRetryableJobs, { limit: 20 });
    let requeued = 0;
    for (const { media } of failed) {
      if (media.mediaType !== "video") continue;
      await ctx.runMutation(internal.media.requeueJob, { mediaId: media._id });
      requeued += 1;
    }
    return { requeued };
  },
});
