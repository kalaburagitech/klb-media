import type { Env } from "./utils";
import {
  buildPublicUrl,
  cacheHeaders,
  corsHeaders,
  json,
  sanitizeKey,
  unauthorized,
  verifyAuth,
} from "./utils";
import { createPresignedPutUrl, proxyToConvex } from "./r2";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/health") {
      return json({ status: "ok", service: "klb-media-api", bucket: env.R2_BUCKET });
    }

    // CDN delivery: GET /cdn/{key...}
    if (url.pathname.startsWith("/cdn/") && request.method === "GET") {
      const key = sanitizeKey(decodeURIComponent(url.pathname.slice("/cdn/".length)));
      if (!key) return json({ error: "Invalid key" }, 400);

      const object = await env.MEDIA_BUCKET.get(key, {
        range: request.headers.get("Range") ?? undefined,
      });

      if (!object) return json({ error: "Not found" }, 404);

      const headers = cacheHeaders(
        object.httpMetadata?.contentType ?? "application/octet-stream",
        key.includes("/hls/") ? 3600 : 31536000
      );

      if (object.httpEtag) headers["ETag"] = object.httpEtag;
      if (object.size) headers["Content-Length"] = String(object.size);

      return new Response(object.body, { status: object.range ? 206 : 200, headers });
    }

    // Presigned upload init: POST /v1/uploads/init
    if (url.pathname === "/v1/uploads/init" && request.method === "POST") {
      if (!verifyAuth(request, env)) return unauthorized();

      const body = (await request.json()) as {
        key: string;
        contentType: string;
        expiresInSeconds?: number;
      };

      if (!body.key || !body.contentType) {
        return json({ error: "key and contentType are required" }, 400);
      }

      const uploadUrl = await createPresignedPutUrl(
        env,
        body.key,
        body.contentType,
        body.expiresInSeconds ?? 3600
      );

      return json({
        success: true,
        uploadUrl,
        key: body.key,
        bucket: env.R2_BUCKET,
        publicUrl: buildPublicUrl(env, body.key),
      });
    }

    // Proxy API routes to Convex HTTP actions
    if (url.pathname.startsWith("/api/")) {
      return proxyToConvex(env, `${url.pathname}${url.search}`, {
        method: request.method,
        headers: request.headers,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
      });
    }

    return json(
      {
        service: "KLB Media API",
        version: "2.0.0",
        endpoints: {
          health: "GET /health",
          cdn: "GET /cdn/{r2Key}",
          uploadInit: "POST /v1/uploads/init",
          mediaList: "GET /api/media",
          mediaGet: "GET /api/media/{id}",
          uploadInitConvex: "POST /api/upload/init",
          uploadComplete: "POST /api/upload/complete",
          uploadDirect: "POST /api/upload",
        },
      },
      200
    );
  },
};
