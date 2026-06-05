import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  media: defineTable({
    userId: v.string(), // Clerk user ID
    fileName: v.string(),
    storageId: v.id("_storage"),
    size: v.number(),
    contentType: v.string(),
    createdAt: v.number(), // Unix timestamp
  })
    .index("by_user", ["userId"])
    .index("by_created_at", ["createdAt"]),
});
