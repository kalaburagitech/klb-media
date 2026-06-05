import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const populate = action({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching dummy image...");
    const response = await fetch("https://picsum.photos/400/300");
    const blob = await response.blob();

    console.log("Generating upload URL...");
    const uploadUrl = await ctx.storage.generateUploadUrl();

    console.log("Uploading dummy image to Convex Storage...");
    const uploadResult = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": blob.type },
      body: blob,
    });
    
    if (!uploadResult.ok) {
      throw new Error(`Failed to upload to Convex Storage: ${uploadResult.statusText}`);
    }

    const { storageId } = await uploadResult.json();

    console.log("Saving metadata to database...");
    await ctx.runMutation(internal.seed.insertMockMedia, {
      storageId,
      fileName: "sample-nature-image.jpg",
      size: blob.size,
      contentType: blob.type,
      userId: "mock-user-id" // Specific ID so we can fetch it for all users
    });

    console.log("Seed complete!");
    return "Seed complete!";
  },
});

export const insertMockMedia = internalMutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    size: v.number(),
    contentType: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("media", {
      userId: args.userId,
      fileName: args.fileName,
      storageId: args.storageId,
      size: args.size,
      contentType: args.contentType,
      createdAt: Date.now(),
    });
  }
});
