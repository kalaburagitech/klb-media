import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { hlsValidator, metadataValidator, variantValidator } from "./lib/mediaTypes";

export default defineSchema({
  media: defineTable({
    userId: v.string(),
    fileName: v.string(),
    size: v.number(),
    contentType: v.string(),
    mediaType: v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("document"),
      v.literal("other")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("failed")
    ),
    r2Key: v.string(),
    r2Bucket: v.string(),
    publicUrl: v.optional(v.string()),
    variants: v.array(variantValidator),
    hls: v.optional(hlsValidator),
    metadata: v.optional(metadataValidator),
    processingError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_created_at", ["createdAt"])
    .index("by_status", ["status"])
    .index("by_r2_key", ["r2Key"]),

  processingJobs: defineTable({
    mediaId: v.id("media"),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    attempts: v.number(),
    maxAttempts: v.number(),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_media", ["mediaId"]),
});
