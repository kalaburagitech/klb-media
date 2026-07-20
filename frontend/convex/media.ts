import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import {
  buildOriginalKey,
  detectMediaType,
  variantValidator,
  hlsValidator,
  metadataValidator,
} from "./lib/mediaTypes";
import { buildAppDeliveryUrl, isPrivateR2EndpointUrl } from "./lib/r2Config";
import { shouldTranscodeMediaType } from "./lib/processingConfig";

const DEFAULT_USER_ID = "admin-id";

function resolveUserId(explicitUserId?: string): string {
  return explicitUserId ?? DEFAULT_USER_ID;
}

async function requireSignedIn(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return identity;
}

type InitUploadArgs = { fileName: string; size: number; contentType: string; userId?: string };
async function initUploadImpl(ctx: MutationCtx, args: InitUploadArgs) {
  const userId = resolveUserId(args.userId);
  const mediaType = detectMediaType(args.contentType);
  const now = Date.now();
  const mediaId = await ctx.db.insert("media", {
    userId, fileName: args.fileName, size: args.size, contentType: args.contentType,
    mediaType, status: "pending", r2Key: "", r2Bucket: process.env.R2_BUCKET ?? "klbmedia",
    variants: [], createdAt: now, updatedAt: now,
  });
  const r2Key = buildOriginalKey(userId, mediaId, args.fileName);
  await ctx.db.patch(mediaId, { r2Key, status: "uploading", updatedAt: Date.now() });
  return { mediaId, r2Key, bucket: process.env.R2_BUCKET ?? "klbmedia" };
}

type CompleteUploadArgs = { mediaId: import("./_generated/dataModel").Id<"media">; size?: number };
async function completeUploadImpl(ctx: MutationCtx, args: CompleteUploadArgs) {
  const media = await ctx.db.get(args.mediaId);
  if (!media) throw new Error("Media not found");
  const now = Date.now();
  await ctx.db.patch(args.mediaId, { status: "processing", size: args.size ?? media.size, updatedAt: now });
  if (shouldTranscodeMediaType(media.mediaType)) {
    const existingJob = await ctx.db.query("processingJobs").withIndex("by_media", (q) => q.eq("mediaId", args.mediaId)).first();
    if (!existingJob) {
      await ctx.db.insert("processingJobs", { mediaId: args.mediaId, status: "queued", attempts: 0, maxAttempts: 5, createdAt: now, updatedAt: now });
    }
    await ctx.scheduler.runAfter(0, internal.processing.dispatchJob, { mediaId: args.mediaId });
  } else {
    await ctx.scheduler.runAfter(0, internal.processing.finalizeOriginalOnly, { mediaId: args.mediaId });
  }
  return { mediaId: args.mediaId, status: "processing" as const, mode: shouldTranscodeMediaType(media.mediaType) ? "transcoding" as const : "original_only" as const };
}

export const initUpload = mutation({
  args: {
    fileName: v.string(),
    size: v.number(),
    contentType: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSignedIn(ctx);
    return initUploadImpl(ctx, args);
  },
});

export const initUploadFromService = internalMutation({
  args: { fileName: v.string(), size: v.number(), contentType: v.string(), userId: v.optional(v.string()) },
  handler: initUploadImpl,
});

export const completeUpload = mutation({
  args: {
    mediaId: v.id("media"),
    size: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSignedIn(ctx);
    return completeUploadImpl(ctx, args);
  },
});

export const completeUploadFromService = internalMutation({
  args: { mediaId: v.id("media"), size: v.optional(v.number()) },
  handler: completeUploadImpl,
});

/** Manually trigger video transcoding when TRANSCODING_ENABLED=true (future use). */
export const requestVideoTranscoding = mutation({
  args: { mediaId: v.id("media") },
  handler: async (ctx, args) => {
    await requireSignedIn(ctx);
    const media = await ctx.db.get(args.mediaId);
    if (!media) throw new Error("Media not found");
    if (media.mediaType !== "video") {
      throw new Error("Transcoding is only available for video files");
    }

    const now = Date.now();
    await ctx.db.patch(args.mediaId, {
      status: "processing",
      processingError: undefined,
      updatedAt: now,
    });

    const existingJob = await ctx.db
      .query("processingJobs")
      .withIndex("by_media", (q) => q.eq("mediaId", args.mediaId))
      .first();

    if (!existingJob) {
      await ctx.db.insert("processingJobs", {
        mediaId: args.mediaId,
        status: "queued",
        attempts: 0,
        maxAttempts: 5,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existingJob._id, {
        status: "queued",
        updatedAt: now,
      });
    }

    await ctx.scheduler.runAfter(0, internal.processing.dispatchJob, {
      mediaId: args.mediaId,
    });

    return { mediaId: args.mediaId, status: "processing" as const };
  },
});

export const markReady = internalMutation({
  args: {
    mediaId: v.id("media"),
    publicUrl: v.string(),
    variants: v.array(variantValidator),
    hls: v.optional(hlsValidator),
    metadata: v.optional(metadataValidator),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.mediaId, {
      status: "ready",
      publicUrl: args.publicUrl,
      variants: args.variants,
      hls: args.hls,
      metadata: args.metadata,
      processingError: undefined,
      updatedAt: Date.now(),
    });

    const job = await ctx.db
      .query("processingJobs")
      .withIndex("by_media", (q) => q.eq("mediaId", args.mediaId))
      .first();

    if (job) {
      await ctx.db.patch(job._id, {
        status: "completed",
        updatedAt: Date.now(),
      });
    }
  },
});

export const markFailed = internalMutation({
  args: {
    mediaId: v.id("media"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.mediaId, {
      status: "failed",
      processingError: args.error,
      updatedAt: Date.now(),
    });

    const job = await ctx.db
      .query("processingJobs")
      .withIndex("by_media", (q) => q.eq("mediaId", args.mediaId))
      .first();

    if (job) {
      await ctx.db.patch(job._id, {
        status: "failed",
        lastError: args.error,
        updatedAt: Date.now(),
      });
    }
  },
});

export const list = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    mediaType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSignedIn(ctx);
    const userId = DEFAULT_USER_ID;

    const userFiles = await ctx.db
      .query("media")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const mockFiles = await ctx.db
      .query("media")
      .withIndex("by_user", (q) => q.eq("userId", "mock-user-id"))
      .order("desc")
      .collect();

    let files = [...userFiles, ...mockFiles];

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      files = files.filter(
        (f) =>
          f.fileName.toLowerCase().includes(searchLower) ||
          f.contentType.toLowerCase().includes(searchLower)
      );
    }

    if (args.status) {
      files = files.filter((f) => f.status === args.status);
    }

    if (args.mediaType) {
      files = files.filter((f) => f.mediaType === args.mediaType);
    }

    return files;
  },
});

export const getById = query({
  args: { id: v.id("media") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getUrl = query({
  args: { id: v.id("media"), variant: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const media = await ctx.db.get(args.id);
    if (!media) return null;

    if (args.variant) {
      const variant = media.variants.find((item) => item.label === args.variant);
      if (variant?.r2Key) return buildAppDeliveryUrl(variant.r2Key);
      if (variant?.url && !isPrivateR2EndpointUrl(variant.url)) return variant.url;
      return null;
    }

    if (media.hls?.masterUrl && !isPrivateR2EndpointUrl(media.hls.masterUrl)) {
      return media.hls.masterUrl;
    }

    if (media.r2Key) return buildAppDeliveryUrl(media.r2Key);

    if (media.publicUrl && !isPrivateR2EndpointUrl(media.publicUrl)) {
      return media.publicUrl;
    }

    const originalVariant = media.variants.find((item) => item.label === "original");
    if (originalVariant?.r2Key) return buildAppDeliveryUrl(originalVariant.r2Key);

    return null;
  },
});

export const deleteMedia = mutation({
  args: { id: v.id("media") },
  handler: async (ctx, args) => {
    await requireSignedIn(ctx);
    const userId = DEFAULT_USER_ID;
    const media = await ctx.db.get(args.id);
    if (!media) throw new Error("Media not found");

    if (media.userId !== userId && media.userId !== "mock-user-id") {
      throw new Error("Unauthorized access to deleteMedia");
    }

    await ctx.scheduler.runAfter(0, internal.processing.cleanupMediaAssets, {
      mediaId: args.id,
      userId: media.userId,
      r2Key: media.r2Key,
    });

    const jobs = await ctx.db
      .query("processingJobs")
      .withIndex("by_media", (q) => q.eq("mediaId", args.id))
      .collect();

    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireSignedIn(ctx);
    const userId = DEFAULT_USER_ID;

    const userFiles = await ctx.db
      .query("media")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const mockFiles = await ctx.db
      .query("media")
      .withIndex("by_user", (q) => q.eq("userId", "mock-user-id"))
      .collect();

    const files = [...userFiles, ...mockFiles];
    const readyFiles = files.filter((f) => f.status === "ready");
    const processingFiles = files.filter((f) => f.status === "processing");

    return {
      totalFiles: files.length,
      readyFiles: readyFiles.length,
      processingFiles: processingFiles.length,
      totalSize: files.reduce((acc, file) => acc + file.size, 0),
    };
  },
});

export const insertFromApi = internalMutation({
  args: {
    fileName: v.string(),
    size: v.number(),
    contentType: v.string(),
    userId: v.string(),
    r2Key: v.string(),
    r2Bucket: v.string(),
    publicUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const mediaType = detectMediaType(args.contentType);

    const mediaId = await ctx.db.insert("media", {
      userId: args.userId,
      fileName: args.fileName,
      size: args.size,
      contentType: args.contentType,
      mediaType,
      status: "processing",
      r2Key: args.r2Key,
      r2Bucket: args.r2Bucket,
      publicUrl: args.publicUrl,
      variants: [],
      createdAt: now,
      updatedAt: now,
    });

    if (shouldTranscodeMediaType(mediaType)) {
      await ctx.db.insert("processingJobs", {
        mediaId,
        status: "queued",
        attempts: 0,
        maxAttempts: 5,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.processing.dispatchJob, { mediaId });
    } else {
      await ctx.scheduler.runAfter(0, internal.processing.finalizeOriginalOnly, { mediaId });
    }

    return mediaId;
  },
});

export const getMediaForProcessing = internalQuery({
  args: { mediaId: v.id("media") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.mediaId);
  },
});

export const incrementJobAttempt = internalMutation({
  args: { mediaId: v.id("media"), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("processingJobs")
      .withIndex("by_media", (q) => q.eq("mediaId", args.mediaId))
      .first();

    if (!job) return null;

    const attempts = job.attempts + 1;
    await ctx.db.patch(job._id, {
      attempts,
      status: "running",
      lastError: args.error,
      updatedAt: Date.now(),
    });

    return { attempts, maxAttempts: job.maxAttempts };
  },
});

export const getQueuedJobs = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("processingJobs")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .take(args.limit ?? 20);

    const results = [];
    for (const job of jobs) {
      const media = await ctx.db.get(job.mediaId);
      if (media) results.push({ job, media });
    }
    return results;
  },
});

export const getFailedRetryableJobs = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const failedMedia = await ctx.db
      .query("media")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .take(args.limit ?? 20);

    const results = [];
    for (const media of failedMedia) {
      const job = await ctx.db
        .query("processingJobs")
        .withIndex("by_media", (q) => q.eq("mediaId", media._id))
        .first();
      if (job && job.attempts < job.maxAttempts) {
        results.push({ job, media });
      }
    }
    return results;
  },
});

export const requeueJob = internalMutation({
  args: { mediaId: v.id("media") },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("processingJobs")
      .withIndex("by_media", (q) => q.eq("mediaId", args.mediaId))
      .first();

    if (!job || job.status !== "failed") return;

    await ctx.db.patch(job._id, {
      status: "queued",
      updatedAt: Date.now(),
    });

    await ctx.db.patch(args.mediaId, {
      status: "processing",
      processingError: undefined,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.processing.dispatchJob, {
      mediaId: args.mediaId,
    });
  },
});
