"use node";

import { v } from "convex/values";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import {
  createPresignedDownloadUrl,
  createPresignedUploadUrl,
  deleteR2Object,
  deleteR2Prefix,
  getPublicUrlForKey,
  headR2Object,
} from "./lib/r2Client";
import { getR2Config } from "./lib/r2Config";

async function requireSignedIn(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return identity;
}

async function requireMediaAdmin(ctx: ActionCtx) {
  const identity = await requireSignedIn(ctx);
  const allowed = (process.env.MEDIA_ADMIN_EMAILS ?? "")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  const email = String(identity.email ?? "").trim().toLowerCase();
  if (!email || !allowed.includes(email)) throw new Error("Forbidden");
  return identity;
}

export const getPresignedUploadUrl = action({
  args: {
    key: v.string(),
    contentType: v.string(),
    expiresInSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSignedIn(ctx);
    return await createPresignedUploadUrl(
      args.key,
      args.contentType,
      args.expiresInSeconds ?? 3600
    );
  },
});

export const getPresignedUploadUrlInternal = internalAction({
  args: { key: v.string(), contentType: v.string(), expiresInSeconds: v.optional(v.number()) },
  handler: async (_ctx, args) => createPresignedUploadUrl(args.key, args.contentType, args.expiresInSeconds ?? 900),
});

export const getPresignedDownloadUrl = action({
  args: {
    key: v.string(),
    expiresInSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSignedIn(ctx);
    return await createPresignedDownloadUrl(args.key, args.expiresInSeconds ?? 3600);
  },
});

export const getPublicUrl = action({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await requireSignedIn(ctx);
    return getPublicUrlForKey(args.key);
  },
});

export const getPublicUrlInternal = internalAction({
  args: { key: v.string() },
  handler: async (_ctx, args) => getPublicUrlForKey(args.key),
});

export const verifyObjectExists = action({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await requireSignedIn(ctx);
    return await headR2Object(args.key);
  },
});

export const deleteObject = action({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await requireMediaAdmin(ctx);
    await deleteR2Object(args.key);
    return { success: true };
  },
});

export const deletePrefix = action({
  args: { prefix: v.string() },
  handler: async (ctx, args) => {
    await requireMediaAdmin(ctx);
    await deleteR2Prefix(args.prefix);
    return { success: true };
  },
});

export const getBucketConfig = action({
  args: {},
  handler: async (ctx) => {
    await requireMediaAdmin(ctx);
    const config = getR2Config();
    return {
      bucket: config.bucket,
      publicBaseUrl: config.publicBaseUrl,
      endpoint: config.endpoint,
    };
  },
});
