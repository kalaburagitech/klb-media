import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle OPTIONS for all routes
http.route({
  path: "/api/media",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/media/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/upload",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

// GET /api/media
http.route({
  path: "/api/media",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Return all media (mocked implementation for public API)
    const media = await ctx.runQuery(api.media.list, {});
    return new Response(JSON.stringify(media), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      },
    });
  }),
});

// GET /api/media/:id
http.route({
  pathPrefix: "/api/media/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const storageId = url.pathname.split("/api/media/")[1];

    if (!storageId) {
      return new Response("Missing storage ID", { status: 400, headers: corsHeaders });
    }

    try {
      const fileUrl = await ctx.runQuery(api.media.getUrl, { storageId: storageId as Id<"_storage"> });
      if (!fileUrl) {
        return new Response("File not found", { status: 404, headers: corsHeaders });
      }

      // Redirect directly to the secure convex cloud storage URL
      return new Response(null, {
        status: 302,
        headers: { Location: fileUrl, ...corsHeaders },
      });
    } catch (error) {
      return new Response("Invalid ID or file not found", { status: 404, headers: corsHeaders });
    }
  }),
});

// POST /api/upload
http.route({
  path: "/api/upload",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const contentType = request.headers.get("Content-Type") || "application/octet-stream";
    const blob = await request.blob();
    
    if (blob.size === 0) {
      return new Response("Empty file", { status: 400, headers: corsHeaders });
    }

    // 1. Get an upload URL
    const uploadUrl = await ctx.runMutation(api.media.generateUploadUrl, {});

    // 2. Upload the file to Convex Storage
    const uploadResult = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: blob,
    });

    if (!uploadResult.ok) {
      return new Response("Failed to store file", { status: 500, headers: corsHeaders });
    }

    const { storageId } = await uploadResult.json();

    // 3. Save to database
    // We use an internal mutation because we don't have Clerk auth here
    await ctx.runMutation(internal.seed.insertMockMedia, {
      storageId,
      fileName: `api-upload-${Date.now()}`, // Could pull from headers if provided
      size: blob.size,
      contentType: contentType,
      userId: "api-user"
    });

    // 4. Return the ID and URL
    const fileUrl = await ctx.runQuery(api.media.getUrl, { storageId });

    return new Response(JSON.stringify({
      success: true,
      storageId,
      url: fileUrl
    }), {
      status: 201,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders 
      },
    });
  }),
});

export default http;
