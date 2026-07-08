"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import {
  createPresignedDownloadUrl,
  createPresignedUploadUrl,
  deleteR2Object,
  deleteR2Prefix,
  getPublicUrlForKey,
  headR2Object,
} from "./lib/r2Client";
import { getR2Config } from "./lib/r2Config";

export const getPresignedUploadUrl = action({
  args: {
    key: v.string(),
    contentType: v.string(),
    expiresInSeconds: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    return await createPresignedUploadUrl(
      args.key,
      args.contentType,
      args.expiresInSeconds ?? 3600
    );
  },
});

export const getPresignedDownloadUrl = action({
  args: {
    key: v.string(),
    expiresInSeconds: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    return await createPresignedDownloadUrl(args.key, args.expiresInSeconds ?? 3600);
  },
});

export const getPublicUrl = action({
  args: { key: v.string() },
  handler: async (_ctx, args) => {
    return getPublicUrlForKey(args.key);
  },
});

export const verifyObjectExists = action({
  args: { key: v.string() },
  handler: async (_ctx, args) => {
    return await headR2Object(args.key);
  },
});

export const deleteObject = action({
  args: { key: v.string() },
  handler: async (_ctx, args) => {
    await deleteR2Object(args.key);
    return { success: true };
  },
});

export const deletePrefix = action({
  args: { prefix: v.string() },
  handler: async (_ctx, args) => {
    await deleteR2Prefix(args.prefix);
    return { success: true };
  },
});

export const getBucketConfig = action({
  args: {},
  handler: async () => {
    const config = getR2Config();
    return {
      bucket: config.bucket,
      publicBaseUrl: config.publicBaseUrl,
      endpoint: config.endpoint,
    };
  },
});
