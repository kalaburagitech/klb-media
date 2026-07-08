import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { buildOriginalKey, detectMediaType } from "./lib/mediaTypes";

export const populate = action({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching dummy image...");
    const response = await fetch("https://picsum.photos/400/300");
    const blob = await response.blob();

    const userId = "mock-user-id";
    const fileName = "sample-nature-image.jpg";
    const tempId = crypto.randomUUID();
    const r2Key = buildOriginalKey(userId, tempId, fileName);

    console.log("Uploading to R2...");
    const presigned = await ctx.runAction(api.r2Actions.getPresignedUploadUrl, {
      key: r2Key,
      contentType: blob.type,
    });

    const uploadResult = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": blob.type },
      body: blob,
    });

    if (!uploadResult.ok) {
      throw new Error(`Failed to upload to R2: ${uploadResult.statusText}`);
    }

    const publicUrl = await ctx.runAction(api.r2Actions.getPublicUrl, { key: r2Key });

    console.log("Saving metadata to database...");
    await ctx.runMutation(internal.seed.insertMockMedia, {
      fileName,
      size: blob.size,
      contentType: blob.type,
      userId,
      r2Key,
      r2Bucket: presigned.bucket,
      publicUrl,
    });

    console.log("Seed complete!");
    return "Seed complete!";
  },
});

export const insertMockMedia = internalMutation({
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
      status: "ready",
      r2Key: args.r2Key,
      r2Bucket: args.r2Bucket,
      publicUrl: args.publicUrl,
      variants: [
        {
          label: "original",
          r2Key: args.r2Key,
          contentType: args.contentType,
          format: args.fileName.split(".").pop() ?? "jpg",
          url: args.publicUrl,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    return mediaId;
  },
});
