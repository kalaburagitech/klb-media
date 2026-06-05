import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFile = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    size: v.number(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = "admin-id";

    const mediaId = await ctx.db.insert("media", {
      userId: userId,
      fileName: args.fileName,
      storageId: args.storageId,
      size: args.size,
      contentType: args.contentType,
      createdAt: Date.now(),
    });

    return mediaId;
  },
});

export const list = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = "admin-id";

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

    const files = [...userFiles, ...mockFiles];

    // Simple manual filter for search (can be optimized with full-text search later)
    let results = files;
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      results = files.filter(
        (f) =>
          f.fileName.toLowerCase().includes(searchLower) ||
          f.contentType.toLowerCase().includes(searchLower)
      );
    }

    return results;
  },
});

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const deleteMedia = mutation({
  args: { id: v.id("media") },
  handler: async (ctx, args) => {
    const userId = "admin-id";

    const media = await ctx.db.get(args.id);
    if (!media) {
      throw new Error("Media not found");
    }

    if (media.userId !== userId && media.userId !== "mock-user-id") {
      throw new Error("Unauthorized access to deleteMedia");
    }

    // Delete from storage
    await ctx.storage.delete(media.storageId);
    
    // Delete from DB
    await ctx.db.delete(args.id);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = "admin-id";

    const userFiles = await ctx.db
      .query("media")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const mockFiles = await ctx.db
      .query("media")
      .withIndex("by_user", (q) => q.eq("userId", "mock-user-id"))
      .collect();

    const files = [...userFiles, ...mockFiles];

    const totalFiles = files.length;
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);

    return { totalFiles, totalSize };
  },
});
