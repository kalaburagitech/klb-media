import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { buildOriginalKey, detectMediaType } from "./lib/mediaTypes";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-File-Name, X-Content-Type, X-Media-Id",
};

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf",
  "text/plain", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function isAuthorizedServiceRequest(request: Request): boolean {
  const secret = process.env.MEDIA_SERVICE_TOKEN?.trim();
  if (!secret) return false;
  return request.headers.get("Authorization") === `Bearer ${secret}`;
}

function requireServiceRequest(request: Request): Response | null {
  return isAuthorizedServiceRequest(request)
    ? null
    : jsonResponse({ error: "Unauthorized" }, 401);
}

function validateUpload(contentType: string, size: number): Response | null {
  const normalized = contentType.split(";", 1)[0].trim().toLowerCase();
  if (!ALLOWED_UPLOAD_TYPES.has(normalized)) return jsonResponse({ error: "Unsupported file type" }, 415);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
    return jsonResponse({ error: "File must be between 1 byte and 25 MB" }, 413);
  }
  return null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function handleOptions(): Response {
  return new Response(null, { headers: corsHeaders });
}

const optionRoutes = [
  "/api/media",
  "/api/upload",
  "/api/upload/init",
  "/api/upload/complete",
  "/webhooks/transcoder",
];

for (const path of optionRoutes) {
  http.route({ path, method: "OPTIONS", handler: httpAction(async () => handleOptions()) });
}

http.route({
  pathPrefix: "/api/media/",
  method: "OPTIONS",
  handler: httpAction(async () => handleOptions()),
});

// GET /api/media — list all media with optional filters
http.route({
  path: "/api/media",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const unauthorized = requireServiceRequest(request);
    if (unauthorized) return unauthorized;
    const url = new URL(request.url);
    const search = url.searchParams.get("search") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const mediaType = url.searchParams.get("type") ?? undefined;

    const media = await ctx.runQuery(api.media.list, { search, status, mediaType });
    return jsonResponse({ success: true, data: media, count: media.length });
  }),
});

// GET /api/media/:id — get media metadata or redirect to delivery URL
http.route({
  pathPrefix: "/api/media/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.replace("/api/media/", "").split("/");
    const mediaId = pathParts[0];
    const variant = pathParts[1] ?? url.searchParams.get("variant") ?? undefined;
    const format = url.searchParams.get("format") ?? "redirect";

    if (!mediaId) {
      return jsonResponse({ error: "Missing media ID" }, 400);
    }

    try {
      const media = await ctx.runQuery(api.media.getById, {
        id: mediaId as Id<"media">,
      });

      if (!media) {
        return jsonResponse({ error: "Media not found" }, 404);
      }

      if (format === "json") {
        return jsonResponse({ success: true, data: media });
      }

      const fileUrl = await ctx.runQuery(api.media.getUrl, {
        id: mediaId as Id<"media">,
        variant: variant ?? undefined,
      });

      if (!fileUrl) {
        return jsonResponse({ error: "Delivery URL not available", status: media.status }, 404);
      }

      return new Response(null, {
        status: 302,
        headers: { Location: fileUrl, ...corsHeaders },
      });
    } catch {
      return jsonResponse({ error: "Invalid media ID" }, 404);
    }
  }),
});

// POST /api/upload/init — initialize R2 presigned upload
http.route({
  path: "/api/upload/init",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const unauthorized = requireServiceRequest(request);
    if (unauthorized) return unauthorized;
    let body: {
      fileName?: string;
      size?: number;
      contentType?: string;
      userId?: string;
    };

    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const fileName = body.fileName ?? request.headers.get("X-File-Name");
    const contentType =
      body.contentType ?? request.headers.get("X-Content-Type") ?? "application/octet-stream";
    const size = body.size ?? 0;

    if (!fileName) {
      return jsonResponse({ error: "fileName is required" }, 400);
    }
    const invalidUpload = validateUpload(contentType, size);
    if (invalidUpload) return invalidUpload;

    const init = await ctx.runMutation(internal.media.initUploadFromService, {
      fileName,
      size,
      contentType,
      userId: body.userId ?? "api-user",
    });

    const presigned = await ctx.runAction(internal.r2Actions.getPresignedUploadUrlInternal, {
      key: init.r2Key,
      contentType,
    });

    return jsonResponse(
      {
        success: true,
        mediaId: init.mediaId,
        uploadUrl: presigned.uploadUrl,
        r2Key: init.r2Key,
        bucket: init.bucket,
        expiresAt: presigned.expiresAt,
        instructions: {
          method: "PUT",
          headers: { "Content-Type": contentType },
        },
      },
      201
    );
  }),
});

// POST /api/upload/complete — finalize upload and trigger processing
http.route({
  path: "/api/upload/complete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const unauthorized = requireServiceRequest(request);
    if (unauthorized) return unauthorized;
    let body: { mediaId?: string; size?: number };

    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const mediaId = body.mediaId ?? request.headers.get("X-Media-Id");
    if (!mediaId) {
      return jsonResponse({ error: "mediaId is required" }, 400);
    }

    try {
      const result = await ctx.runMutation(internal.media.completeUploadFromService, {
        mediaId: mediaId as Id<"media">,
        size: body.size,
      });

      return jsonResponse({ success: true, ...result });
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Failed to complete upload" },
        400
      );
    }
  }),
});

// POST /api/upload — legacy direct upload via Convex (proxies to R2)
http.route({
  path: "/api/upload",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const unauthorized = requireServiceRequest(request);
    if (unauthorized) return unauthorized;
    const contentType = request.headers.get("Content-Type") || "application/octet-stream";
    const fileName =
      request.headers.get("X-File-Name") ?? `api-upload-${Date.now()}.${contentType.split("/")[1] ?? "bin"}`;
    const blob = await request.blob();

    if (blob.size === 0) {
      return jsonResponse({ error: "Empty file" }, 400);
    }
    const invalidUpload = validateUpload(contentType, blob.size);
    if (invalidUpload) return invalidUpload;

    const userId = "api-user";
    const mediaType = detectMediaType(contentType);
    const tempId = crypto.randomUUID();
    const r2Key = buildOriginalKey(userId, tempId, fileName);

    const presigned = await ctx.runAction(internal.r2Actions.getPresignedUploadUrlInternal, {
      key: r2Key,
      contentType,
    });

    const uploadResult = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    });

    if (!uploadResult.ok) {
      return jsonResponse({ error: "Failed to store file in R2" }, 500);
    }

    const publicUrl = await ctx.runAction(internal.r2Actions.getPublicUrlInternal, { key: r2Key });

    const mediaId = await ctx.runMutation(internal.media.insertFromApi, {
      fileName,
      size: blob.size,
      contentType,
      userId,
      r2Key,
      r2Bucket: presigned.bucket,
      publicUrl,
    });

    return jsonResponse(
      {
        success: true,
        mediaId,
        r2Key,
        url: publicUrl,
        mediaType,
        status: "processing",
        mode: "original_only",
      },
      201
    );
  }),
});

// POST /webhooks/transcoder — processing completion callback
http.route({
  path: "/webhooks/transcoder",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.TRANSCODER_SECRET;
    if (secret) {
      const auth = request.headers.get("Authorization");
      if (auth !== `Bearer ${secret}`) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    await ctx.runAction(internal.processing.handleTranscoderWebhook, { payload });
    return jsonResponse({ success: true });
  }),
});

export default http;
